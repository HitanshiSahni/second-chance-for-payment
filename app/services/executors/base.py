from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.domain.enums import ActionType, FailureCategory
from app.domain.schemas import PaymentFailureEvent


@dataclass
class ExecutionOutcome:
    action: ActionType
    success: bool
    cost: float
    detail: str


class BaseExecutor(ABC):
    @abstractmethod
    def execute(
        self, event: PaymentFailureEvent, failure_category: FailureCategory
    ) -> ExecutionOutcome:
        ...
