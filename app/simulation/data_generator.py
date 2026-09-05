"""
Synthetic historical data generator.

Generates realistic PaymentFailureEvent instances and, for TRAINING data
only, assigns actions via a RANDOMIZED logging policy before sampling an
outcome from the hidden environment. Randomizing the historical action
assignment is what stops the S-learner from just re-deriving whatever
narrow real-world policy happened to log the data -- it's the cheap
stand-in for a proper experiment/RCT that enables counterfactual-style
action comparison (estimated incremental recovery probability).

Held-out evaluation data is generated the same way but is never touched
during training and is scored, in batch, purely via true_recovery_probability
sampling at execution time (see services/executors + core evaluation script).
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.domain.enums import ActionType, Gateway, PaymentType
from app.domain.schemas import PaymentFailureEvent
from app.ml.feature_engineering import ACTIONS, build_features, FEATURE_NAMES
from app.services.failure_profiler import FailureProfiler
from app.simulation.environment import sample_outcome

_FAILURE_CODES = [
    "GATEWAY_TIMEOUT", "GATEWAY_UNAVAILABLE", "NETWORK_ERROR", "RATE_LIMITED",
    "INSUFFICIENT_FUNDS", "ISSUER_DECLINED_SOFT", "BANK_SERVER_ERROR",
    "CARD_EXPIRED", "CARD_INVALID", "MANDATE_EXPIRED", "CVV_MISMATCH",
    "3DS_AUTHENTICATION_REQUIRED", "OTP_FAILED", "ISSUER_DECLINED_HARD",
    "CARD_REPORTED_LOST_OR_STOLEN", "ACCOUNT_CLOSED", "FRAUD_SUSPECTED",
]

# Rough relative frequency weights so common transient failures dominate,
# same shape you'd expect from a real gateway.
_FAILURE_CODE_WEIGHTS = [
    12, 6, 8, 4,
    10, 8, 5,
    9, 5, 3, 4,
    6, 5, 4,
    1, 1, 1,
]
_FAILURE_CODE_WEIGHTS = np.array(_FAILURE_CODE_WEIGHTS, dtype=float)
_FAILURE_CODE_WEIGHTS /= _FAILURE_CODE_WEIGHTS.sum()


def _random_event(rng: np.random.Generator, idx: int) -> PaymentFailureEvent:
    amount = float(np.round(np.exp(rng.normal(6.5, 1.1)), 2))  # lognormal-ish, INR
    amount = max(amount, 50.0)

    failure_code = _FAILURE_CODES[int(rng.choice(len(_FAILURE_CODES), p=_FAILURE_CODE_WEIGHTS))]
    gateways = list(Gateway)
    gateway = gateways[int(rng.integers(0, len(gateways)))]
    gateway_health = float(np.clip(rng.beta(6, 2), 0.0, 1.0))

    is_recurring = bool(rng.random() < 0.4)
    prev_attempts = int(rng.poisson(0.6))
    prev_failures = int(rng.poisson(1.2))
    prev_success = int(rng.poisson(4.0))
    tenure_days = int(max(0, rng.normal(240, 200)))
    hour = int(rng.integers(0, 24))

    return PaymentFailureEvent(
        transaction_id=f"SYN-{idx:07d}",
        amount=amount,
        currency="INR",
        payment_type=PaymentType.RECURRING if is_recurring else PaymentType.ONE_TIME,
        is_recurring=is_recurring,
        failure_code=str(failure_code),
        gateway=gateway,
        gateway_health_score=gateway_health,
        hour_of_day=hour,
        previous_attempts=prev_attempts,
        previous_failures=prev_failures,
        previous_successful_payments=prev_success,
        customer_tenure_days=tenure_days,
        customer_id=f"CUST-{rng.integers(0, 50000):06d}",
    )


def generate_dataset(n: int, seed: int, logging_policy: str = "random") -> pd.DataFrame:
    """Generate n synthetic historical cases with action + observed outcome.

    logging_policy="random": each case's historical action is drawn uniformly
    from the candidate action set, independent of features. This is the
    deconfounding trick described in the module docstring.
    """
    rng = np.random.default_rng(seed)
    rows = []
    for i in range(n):
        event = _random_event(rng, i)
        category = FailureProfiler.classify(event)

        if logging_policy == "random":
            action = ACTIONS[int(rng.integers(0, len(ACTIONS)))]
        else:
            raise ValueError(f"Unknown logging_policy: {logging_policy}")

        outcome = sample_outcome(event, category, action, rng=rng)
        features = build_features(event, category, action)

        row = {name: val for name, val in zip(FEATURE_NAMES, features)}
        row.update(
            {
                "transaction_id": event.transaction_id,
                "amount": event.amount,
                "failure_code": event.failure_code,
                "failure_category": category.value,
                "action": action.value,
                "recovered": int(outcome),
            }
        )
        rows.append(row)

    return pd.DataFrame(rows)


def generate_raw_events(n: int, seed: int) -> list[PaymentFailureEvent]:
    """Generate raw events only (no action/outcome) -- used for live/holdout runs
    where RecoveryOS itself will choose the action."""
    rng = np.random.default_rng(seed)
    return [_random_event(rng, i) for i in range(n)]
