from __future__ import annotations

from datetime import datetime, timedelta

from app.core.config import PolicyConfig
from app.domain.enums import ActionType, FailureCategory
from app.domain.schemas import PaymentFailureEvent
from app.services.executors.base import BaseExecutor, ExecutionOutcome


class WaitScheduler(BaseExecutor):
    """WAIT does not call the gateway. It schedules a future re-evaluation.
    `success` is meaningless for WAIT; kept False for interface uniformity."""

    def __init__(self, config: PolicyConfig):
        self.config = config

    def next_evaluation_at(self, now: datetime | None = None) -> datetime:
        now = now or datetime.utcnow()
        return now + timedelta(minutes=self.config.wait.reevaluation_delay_minutes)

    def execute(self, event: PaymentFailureEvent, failure_category: FailureCategory) -> ExecutionOutcome:
        return ExecutionOutcome(
            action=ActionType.WAIT,
            success=False,
            cost=0.0,
            detail=f"Scheduled for re-evaluation at {self.next_evaluation_at().isoformat()}",
        )


class HaltExecutor(BaseExecutor):
    def execute(self, event: PaymentFailureEvent, failure_category: FailureCategory) -> ExecutionOutcome:
        return ExecutionOutcome(
            action=ActionType.HALT,
            success=False,
            cost=0.0,
            detail="Recovery halted; no further automated action will be taken.",
        )
