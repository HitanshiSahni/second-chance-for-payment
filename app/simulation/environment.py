"""
Hidden simulation environment.

This module represents "the real world" -- the unknown, unobservable
process that actually determines whether a recovery action succeeds. It is
allowed to encode hidden behavioral parameters (e.g. "payment-method
issues respond well to CUSTOMER_RESOLUTION") because in reality nobody
hands you that function; you have to learn it from data.

*** ARCHITECTURAL BOUNDARY ***
Nothing under app/ml/, app/services/, or app/core/ may import this module.
Only app/simulation/data_generator.py (to generate historical training
labels) and app/simulation/mock_gateway.py (to generate live execution
outcomes) are allowed to call into it. If the decision engine imported
this file, every "prediction" would secretly be cheating by reading the
answer key -- that's the circular-fake-logic failure mode the spec
explicitly warns against.
"""
from __future__ import annotations

import numpy as np

from app.domain.enums import ActionType, FailureCategory
from app.domain.schemas import PaymentFailureEvent

_RNG_DEFAULT = np.random.default_rng(1234)

# Hidden affinity matrix: how much each action helps, ON TOP OF baseline,
# for each failure category. This is exactly the kind of "hidden success
# probability" the decision engine must never see directly -- it can only
# ever be inferred statistically from many observed outcomes.
_ACTION_UPLIFT: dict[FailureCategory, dict[ActionType, float]] = {
    FailureCategory.INFRASTRUCTURE_TRANSIENT: {
        ActionType.INFRASTRUCTURE_RECOVERY: 0.45,
        ActionType.SILENT_RETRY: 0.30,
        ActionType.WAIT: 0.20,
        ActionType.CUSTOMER_RESOLUTION: 0.02,
    },
    FailureCategory.TEMPORARY_PAYMENT_ISSUE: {
        ActionType.INFRASTRUCTURE_RECOVERY: 0.05,
        ActionType.SILENT_RETRY: 0.18,
        ActionType.WAIT: 0.22,
        ActionType.CUSTOMER_RESOLUTION: 0.10,
    },
    FailureCategory.PAYMENT_METHOD_ISSUE: {
        ActionType.INFRASTRUCTURE_RECOVERY: 0.01,
        ActionType.SILENT_RETRY: 0.02,
        ActionType.WAIT: 0.01,
        ActionType.CUSTOMER_RESOLUTION: 0.55,
    },
    FailureCategory.CUSTOMER_ACTION_REQUIRED: {
        ActionType.INFRASTRUCTURE_RECOVERY: 0.00,
        ActionType.SILENT_RETRY: 0.03,
        ActionType.WAIT: 0.02,
        ActionType.CUSTOMER_RESOLUTION: 0.48,
    },
    FailureCategory.HARD_UNRECOVERABLE: {
        ActionType.INFRASTRUCTURE_RECOVERY: 0.00,
        ActionType.SILENT_RETRY: 0.00,
        ActionType.WAIT: 0.00,
        ActionType.CUSTOMER_RESOLUTION: 0.01,
    },
    FailureCategory.UNKNOWN: {
        ActionType.INFRASTRUCTURE_RECOVERY: 0.05,
        ActionType.SILENT_RETRY: 0.05,
        ActionType.WAIT: 0.05,
        ActionType.CUSTOMER_RESOLUTION: 0.08,
    },
}

_BASE_RECOVERY_BY_CATEGORY: dict[FailureCategory, float] = {
    FailureCategory.INFRASTRUCTURE_TRANSIENT: 0.15,
    FailureCategory.TEMPORARY_PAYMENT_ISSUE: 0.12,
    FailureCategory.PAYMENT_METHOD_ISSUE: 0.03,
    FailureCategory.CUSTOMER_ACTION_REQUIRED: 0.05,
    FailureCategory.HARD_UNRECOVERABLE: 0.01,
    FailureCategory.UNKNOWN: 0.08,
}


def true_recovery_probability(
    event: PaymentFailureEvent,
    failure_category: FailureCategory,
    action: ActionType,
) -> float:
    """The ground-truth probability of recovery. HIDDEN from the decision engine.

    Composed of:
      - a base rate per failure category,
      - an action-specific uplift (the affinity matrix above),
      - continuous modifiers from gateway health, customer history, and
        retry fatigue (diminishing returns on repeated attempts).
    """
    base = _BASE_RECOVERY_BY_CATEGORY[failure_category]
    uplift = _ACTION_UPLIFT[failure_category].get(action, 0.0)

    # Gateway health matters more for infra-style actions.
    health_modifier = 0.0
    if action in (ActionType.INFRASTRUCTURE_RECOVERY, ActionType.SILENT_RETRY):
        health_modifier = (event.gateway_health_score - 0.5) * 0.25

    # Customers with a strong success history are modestly more likely to
    # resolve payment-method issues themselves.
    total_hist = event.previous_successful_payments + event.previous_failures
    hist_rate = (event.previous_successful_payments / total_hist) if total_hist > 0 else 0.5
    history_modifier = (hist_rate - 0.5) * 0.10

    # Retry fatigue: each additional prior attempt this case has already
    # made reduces the marginal benefit of trying again.
    fatigue_modifier = -0.04 * event.previous_attempts if action in (
        ActionType.INFRASTRUCTURE_RECOVERY, ActionType.SILENT_RETRY
    ) else 0.0

    p = base + uplift + health_modifier + history_modifier + fatigue_modifier
    return float(np.clip(p, 0.005, 0.98))


def sample_outcome(
    event: PaymentFailureEvent,
    failure_category: FailureCategory,
    action: ActionType,
    rng: np.random.Generator | None = None,
) -> bool:
    """Sample a boolean recovery outcome (True = recovered) from the hidden environment."""
    rng = rng or _RNG_DEFAULT
    p = true_recovery_probability(event, failure_category, action)
    return bool(rng.random() < p)
