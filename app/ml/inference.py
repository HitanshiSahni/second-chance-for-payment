"""
Inference layer.

Loads the FROZEN model (trained offline in train.py) and exposes
action-conditioned recovery probability predictions. This module has NO
access to app.simulation.environment -- it only ever sees what the model
learned from historical (feature, action, outcome) rows, exactly like a
real deployment would.
"""
from __future__ import annotations

from functools import lru_cache

import numpy as np

from app.domain.enums import ActionType, FailureCategory
from app.domain.schemas import PaymentFailureEvent
from app.ml.feature_engineering import ACTIONS, build_features
from app.ml.model_registry import load_model


@lru_cache(maxsize=1)
def _get_model():
    return load_model()


def predict_recovery_probabilities(
    event: PaymentFailureEvent, failure_category: FailureCategory
) -> dict[ActionType, float]:
    """Return P(recovery | context, action) for every candidate action,
    including WAIT (the no-intervention baseline)."""
    model = _get_model()
    rows = np.vstack([build_features(event, failure_category, a) for a in ACTIONS])
    probs = model.predict_proba(rows)[:, 1]
    return {action: float(p) for action, p in zip(ACTIONS, probs)}


def predict_single(
    event: PaymentFailureEvent, failure_category: FailureCategory, action: ActionType
) -> float:
    model = _get_model()
    row = build_features(event, failure_category, action).reshape(1, -1)
    return float(model.predict_proba(row)[0, 1])
