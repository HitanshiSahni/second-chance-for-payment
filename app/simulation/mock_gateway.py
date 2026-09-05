"""
Mock Payment Gateway Simulator.

Named honestly per the design brief: this is NOT a real gateway
integration. It independently determines execution outcomes using the
hidden environment (environment.py) -- RecoveryOS does not know the
outcome until this returns.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from app.domain.enums import ActionType, FailureCategory
from app.domain.schemas import PaymentFailureEvent
from app.simulation.environment import sample_outcome


@dataclass
class GatewayExecutionResult:
    action: ActionType
    success: bool
    raw_response: str


class MockPaymentGatewaySimulator:
    """Simulated execution backend. Swap for a real gateway client later
    without changing any caller -- that's the point of the Executor
    abstraction in services/executors/."""

    def __init__(self, seed: int | None = None):
        self._rng = np.random.default_rng(seed) if seed is not None else np.random.default_rng()

    def execute(
        self,
        event: PaymentFailureEvent,
        failure_category: FailureCategory,
        action: ActionType,
    ) -> GatewayExecutionResult:
        success = sample_outcome(event, failure_category, action, rng=self._rng)
        response = "SIMULATED_SUCCESS" if success else "SIMULATED_FAILURE"
        return GatewayExecutionResult(action=action, success=success, raw_response=response)
