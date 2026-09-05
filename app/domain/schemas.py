"""
Pydantic data contracts.

The most important design rule enforced here: `PaymentFailureEvent` contains
FACTS ONLY. There is no field for "correct action", "success probability",
or anything the decision engine is supposed to figure out. If you find
yourself wanting to add such a field, that's a sign the logic belongs in
ml/ or services/, not in the input contract.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.domain.enums import (
    ActionType,
    CaseState,
    FailureCategory,
    Gateway,
    PaymentType,
    ResolutionType,
)


class PaymentFailureEvent(BaseModel):
    """Raw, factual event as received from a payment gateway / webhook."""

    transaction_id: str
    amount: float = Field(gt=0)
    currency: str = "INR"
    payment_type: PaymentType = PaymentType.ONE_TIME
    is_recurring: bool = False

    failure_code: str
    gateway_response_raw: Optional[str] = None
    gateway: Gateway = Gateway.GATEWAY_A
    gateway_health_score: float = Field(default=1.0, ge=0.0, le=1.0)

    timestamp: datetime = Field(default_factory=datetime.utcnow)
    hour_of_day: Optional[int] = None  # derived if not supplied

    previous_attempts: int = 0
    previous_failures: int = 0
    previous_successful_payments: int = 0
    customer_tenure_days: int = 0
    customer_id: str = "unknown"

    def model_post_init(self, __context) -> None:  # pydantic v2 hook
        if self.hour_of_day is None:
            object.__setattr__(self, "hour_of_day", self.timestamp.hour)


class ActionEvaluation(BaseModel):
    action: ActionType
    predicted_recovery_probability: float
    baseline_probability: float
    delta_p: float
    transaction_value: float
    intervention_cost: float
    nir: float
    resolution_type: Optional[ResolutionType] = None


class DecisionExplanation(BaseModel):
    case_id: str
    failure_category: FailureCategory
    available_actions: list[ActionType]
    blocked_actions: dict[str, str]  # action -> reason
    evaluations: list[ActionEvaluation]
    selected_action: ActionType
    selection_reason: str
    current_state: Optional[CaseState] = None


class CaseStatus(BaseModel):
    case_id: str
    transaction_id: str
    state: CaseState
    selected_action: Optional[ActionType] = None
    reevaluation_count: int = 0
    next_evaluation_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class CaseListItem(BaseModel):
    id: str
    transaction_id: str
    customer_id: Optional[str] = None
    amount: float
    currency: str = "INR"
    failure_code: str
    failure_category: Optional[str] = None
    state: CaseState
    selected_action: Optional[ActionType] = None
    is_recovered: bool = False
    recovered_amount: Optional[float] = None
    reevaluation_count: int = 0
    next_evaluation_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class ReevaluateRequest(BaseModel):
    gateway_health_score: Optional[float] = None

