from __future__ import annotations

from app.core.config import PolicyConfig
from app.domain.enums import ActionType, FailureCategory
from app.domain.schemas import PaymentFailureEvent
from app.services.executors.base import BaseExecutor, ExecutionOutcome
from app.simulation.mock_gateway import MockPaymentGatewaySimulator


class GatewayRecoveryExecutor(BaseExecutor):
    """Executes INFRASTRUCTURE_RECOVERY via the mock gateway simulator."""

    def __init__(self, gateway: MockPaymentGatewaySimulator, config: PolicyConfig):
        self.gateway = gateway
        self.config = config

    def execute(self, event: PaymentFailureEvent, failure_category: FailureCategory) -> ExecutionOutcome:
        result = self.gateway.execute(event, failure_category, ActionType.INFRASTRUCTURE_RECOVERY)
        cost = self.config.costs.get(ActionType.INFRASTRUCTURE_RECOVERY.value, 0.0)
        return ExecutionOutcome(
            action=ActionType.INFRASTRUCTURE_RECOVERY,
            success=result.success,
            cost=cost,
            detail=result.raw_response,
        )


class RetryExecutor(BaseExecutor):
    """Executes SILENT_RETRY via the mock gateway simulator."""

    def __init__(self, gateway: MockPaymentGatewaySimulator, config: PolicyConfig):
        self.gateway = gateway
        self.config = config

    def execute(self, event: PaymentFailureEvent, failure_category: FailureCategory) -> ExecutionOutcome:
        result = self.gateway.execute(event, failure_category, ActionType.SILENT_RETRY)
        cost = self.config.costs.get(ActionType.SILENT_RETRY.value, 0.0)
        return ExecutionOutcome(
            action=ActionType.SILENT_RETRY,
            success=result.success,
            cost=cost,
            detail=result.raw_response,
        )
