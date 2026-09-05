"""
Feature engineering.

Single source of truth for turning (event, failure_category, action) into
the numeric feature vector the model sees. Used identically at training
time and inference time -- this file is imported by both train.py and
inference.py so there is no train/serve skew by construction.
"""
from __future__ import annotations

import numpy as np

from app.domain.enums import ActionType, FailureCategory, Gateway, PaymentType
from app.domain.schemas import PaymentFailureEvent

FAILURE_CATEGORIES = list(FailureCategory)
ACTIONS = [
    ActionType.INFRASTRUCTURE_RECOVERY,
    ActionType.SILENT_RETRY,
    ActionType.WAIT,
    ActionType.CUSTOMER_RESOLUTION,
]  # HALT deliberately excluded: it has no recovery probability to predict
GATEWAYS = list(Gateway)

FEATURE_NAMES: list[str] = (
    [
        "amount_log",
        "is_recurring",
        "gateway_health_score",
        "hour_of_day_sin",
        "hour_of_day_cos",
        "previous_attempts",
        "previous_failures",
        "previous_successful_payments",
        "customer_tenure_days_log",
        "success_rate_history",
    ]
    + [f"failure_cat_{c.value}" for c in FAILURE_CATEGORIES]
    + [f"gateway_{g.value}" for g in GATEWAYS]
    + [f"action_{a.value}" for a in ACTIONS]
)


def _one_hot(value, categories: list) -> list[float]:
    return [1.0 if value == c else 0.0 for c in categories]


def build_features(
    event: PaymentFailureEvent,
    failure_category: FailureCategory,
    action: ActionType,
) -> np.ndarray:
    """Build the numeric feature vector for one (event, category, action) triple."""
    total_history = event.previous_successful_payments + event.previous_failures
    success_rate_history = (
        event.previous_successful_payments / total_history if total_history > 0 else 0.5
    )

    hour = event.hour_of_day or 0
    hour_sin = np.sin(2 * np.pi * hour / 24)
    hour_cos = np.cos(2 * np.pi * hour / 24)

    base = [
        np.log1p(event.amount),
        1.0 if event.is_recurring else 0.0,
        event.gateway_health_score,
        hour_sin,
        hour_cos,
        float(event.previous_attempts),
        float(event.previous_failures),
        float(event.previous_successful_payments),
        np.log1p(event.customer_tenure_days),
        success_rate_history,
    ]

    vec = (
        base
        + _one_hot(failure_category, FAILURE_CATEGORIES)
        + _one_hot(event.gateway, GATEWAYS)
        + _one_hot(action, ACTIONS)
    )
    return np.array(vec, dtype=np.float64)


def feature_matrix_for_all_actions(
    event: PaymentFailureEvent, failure_category: FailureCategory
) -> tuple[np.ndarray, list[ActionType]]:
    """Build a stacked feature matrix, one row per candidate action (excluding HALT)."""
    rows = [build_features(event, failure_category, a) for a in ACTIONS]
    return np.vstack(rows), ACTIONS
