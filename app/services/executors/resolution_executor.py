from __future__ import annotations

import uuid

from app.core.config import PolicyConfig
from app.domain.enums import ActionType, FailureCategory, ResolutionType
from app.domain.schemas import PaymentFailureEvent
from app.services.executors.base import BaseExecutor, ExecutionOutcome
from app.simulation.mock_gateway import MockPaymentGatewaySimulator

# Deterministic mapping from failure category -> resolution type. This is
# domain/UX knowledge (which link to show the customer), not an
# intelligence decision, so it's fine for this to be a lookup table.
_RESOLUTION_TYPE_BY_CATEGORY = {
    FailureCategory.PAYMENT_METHOD_ISSUE: ResolutionType.UPDATE_PAYMENT_METHOD,
    FailureCategory.CUSTOMER_ACTION_REQUIRED: ResolutionType.PAYMENT_RETRY_LINK,
}


class ResolutionExecutor(BaseExecutor):
    """Executes CUSTOMER_RESOLUTION. Generates a simulated resolution link
    and (for the simulated batch/demo path) samples whether the customer
    ultimately completes it via the mock gateway."""

    def __init__(self, gateway: MockPaymentGatewaySimulator, config: PolicyConfig):
        self.gateway = gateway
        self.config = config

    def execute(self, event: PaymentFailureEvent, failure_category: FailureCategory) -> ExecutionOutcome:
        resolution_type = _RESOLUTION_TYPE_BY_CATEGORY.get(
            failure_category, ResolutionType.PAYMENT_RETRY_LINK
        )
        link = f"https://pay.recoveryos.sim/resolve/{uuid.uuid4().hex[:12]}"

        result = self.gateway.execute(event, failure_category, ActionType.CUSTOMER_RESOLUTION)
        cost = self.config.costs.get(ActionType.CUSTOMER_RESOLUTION.value, 0.0)
        return ExecutionOutcome(
            action=ActionType.CUSTOMER_RESOLUTION,
            success=result.success,
            cost=cost,
            detail=f"resolution_type={resolution_type.value} link={link} response={result.raw_response}",
        )
