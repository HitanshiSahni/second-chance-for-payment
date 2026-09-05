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

BASE_FEATURE_NAMES: list[str] = (
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

INTERACTION_FEATURE_NAMES: list[str] = (
    [
        f"X_{c.value}__{a.value}"
        for a in ACTIONS
        for c in FAILURE_CATEGORIES
    ]
    + [
        "act_infra_x_health",
        "act_retry_x_health",
        "act_retry_x_fatigue",
        "cust_res_x_hist",
    ]
)

FEATURE_NAMES: list[str] = BASE_FEATURE_NAMES + INTERACTION_FEATURE_NAMES


def _one_hot(value, categories: list) -> list[float]:
    return [1.0 if value == c else 0.0 for c in categories]


def build_features(
    event: PaymentFailureEvent,
    failure_category: FailureCategory,
    action: ActionType,
) -> np.ndarray:
    """Build the 51-element numeric feature vector for one (event, category, action) triple."""
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

    cat_oh = _one_hot(failure_category, FAILURE_CATEGORIES)
    gw_oh = _one_hot(event.gateway, GATEWAYS)
    act_oh = _one_hot(action, ACTIONS)

    # 24 category x action interactions
    cat_act_interactions = []
    for a_enum in ACTIONS:
        is_a = 1.0 if action == a_enum else 0.0
        for c_enum in FAILURE_CATEGORIES:
            is_c = 1.0 if failure_category == c_enum else 0.0
            cat_act_interactions.append(is_c * is_a)

    # 4 domain-specific causal interactions
    is_infra = 1.0 if action == ActionType.INFRASTRUCTURE_RECOVERY else 0.0
    is_retry = 1.0 if action == ActionType.SILENT_RETRY else 0.0
    is_cust = 1.0 if action == ActionType.CUSTOMER_RESOLUTION else 0.0

    act_infra_x_health = is_infra * (event.gateway_health_score - 0.5)
    act_retry_x_health = is_retry * (event.gateway_health_score - 0.5)
    act_retry_x_fatigue = (is_infra + is_retry) * float(event.previous_attempts)
    cust_res_x_hist = is_cust * (success_rate_history - 0.5)

    causal_interactions = [
        act_infra_x_health,
        act_retry_x_health,
        act_retry_x_fatigue,
        cust_res_x_hist,
    ]

    vec = base + cat_oh + gw_oh + act_oh + cat_act_interactions + causal_interactions
    return np.array(vec, dtype=np.float64)


def add_interaction_features(df: "pd.DataFrame") -> "pd.DataFrame":
    """Ensure all 51 engineered features are present in a batch DataFrame."""
    import pandas as pd

    if all(col in df.columns for col in FEATURE_NAMES):
        return df

    df = df.copy()
    nc = {}
    for a in ACTIONS:
        act_col = f"action_{a.value}"
        av = df[act_col] if act_col in df.columns else 0.0
        for c in FAILURE_CATEGORIES:
            cat_col = f"failure_cat_{c.value}"
            cv = df[cat_col] if cat_col in df.columns else 0.0
            nc[f"X_{c.value}__{a.value}"] = cv * av

    infra = (
        df["action_INFRASTRUCTURE_RECOVERY"]
        if "action_INFRASTRUCTURE_RECOVERY" in df.columns
        else 0.0
    )
    retry = df["action_SILENT_RETRY"] if "action_SILENT_RETRY" in df.columns else 0.0
    gw = df["gateway_health_score"] if "gateway_health_score" in df.columns else 0.5
    att = df["previous_attempts"] if "previous_attempts" in df.columns else 0.0
    hist = df["success_rate_history"] if "success_rate_history" in df.columns else 0.5
    cust = (
        df["action_CUSTOMER_RESOLUTION"]
        if "action_CUSTOMER_RESOLUTION" in df.columns
        else 0.0
    )

    nc["act_infra_x_health"] = infra * (gw - 0.5)
    nc["act_retry_x_health"] = retry * (gw - 0.5)
    nc["act_retry_x_fatigue"] = (infra + retry) * att
    nc["cust_res_x_hist"] = cust * (hist - 0.5)

    interaction_df = pd.DataFrame(nc, index=df.index)
    return pd.concat([df, interaction_df], axis=1)


def feature_matrix_for_all_actions(
    event: PaymentFailureEvent, failure_category: FailureCategory
) -> tuple[np.ndarray, list[ActionType]]:
    """Build a stacked feature matrix, one row per candidate action (excluding HALT)."""
    rows = [build_features(event, failure_category, a) for a in ACTIONS]
    return np.vstack(rows), ACTIONS
