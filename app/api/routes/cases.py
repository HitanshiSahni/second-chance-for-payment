from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.domain.enums import CaseState, ActionType
from app.domain.models import Case
from app.domain.schemas import (
    CaseListItem,
    CaseStatus,
    DecisionExplanation,
    PaymentFailureEvent,
    ReevaluateRequest,
)
from app.services.orchestrator import CaseOrchestrator

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("/", response_model=list[CaseListItem])
def list_cases(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List recent recovery cases with their current status."""
    cases = (
        db.query(Case)
        .order_by(Case.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        CaseListItem(
            id=c.id,
            transaction_id=c.transaction_id,
            customer_id=c.customer_id,
            amount=c.amount,
            currency=c.currency or "INR",
            failure_code=c.failure_code,
            failure_category=c.failure_category,
            state=CaseState(c.state),
            selected_action=ActionType(c.selected_action) if c.selected_action else None,
            is_recovered=bool(c.is_recovered),
            recovered_amount=c.recovered_amount,
            reevaluation_count=c.reevaluation_count or 0,
            next_evaluation_at=c.next_evaluation_at,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        for c in cases
    ]


@router.post("/", response_model=DecisionExplanation)
def create_and_process_case(event: PaymentFailureEvent, db: Session = Depends(get_db)):
    """Ingest a payment failure event and run it through the full pipeline once."""
    orchestrator = CaseOrchestrator(db)
    case = orchestrator.create_case(event)
    decision = orchestrator.run_pipeline(case, event)
    return decision


@router.get("/{case_id}/decision", response_model=DecisionExplanation)
def get_case_decision(case_id: str, db: Session = Depends(get_db)):
    """Retrieve the exact decision snapshot recorded for this case."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if not case.latest_decision:
        raise HTTPException(status_code=404, detail="No decision snapshot available for this case")
    return DecisionExplanation(**case.latest_decision)


@router.post("/{case_id}/reevaluate", response_model=DecisionExplanation)
def reevaluate_case(
    case_id: str,
    payload: Optional[ReevaluateRequest] = None,
    db: Session = Depends(get_db),
):
    """Trigger re-evaluation of a case currently in RE_EVALUATE, with optional updated context."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.state != CaseState.RE_EVALUATE.value:
        raise HTTPException(status_code=400, detail=f"Case is in state {case.state}, not RE_EVALUATE")

    raw = dict(case.raw_event)
    if payload and payload.gateway_health_score is not None:
        raw["gateway_health_score"] = payload.gateway_health_score

    event = PaymentFailureEvent(**raw)
    orchestrator = CaseOrchestrator(db)
    decision = orchestrator.resume_case(case, event)
    return decision


@router.get("/{case_id}", response_model=CaseStatus)
def get_case(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return CaseStatus(
        case_id=case.id,
        transaction_id=case.transaction_id,
        state=CaseState(case.state),
        selected_action=ActionType(case.selected_action) if case.selected_action else None,
        reevaluation_count=case.reevaluation_count or 0,
        next_evaluation_at=case.next_evaluation_at,
        created_at=case.created_at,
        updated_at=case.updated_at,
    )


@router.get("/{case_id}/audit")
def get_case_audit_trail(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    from app.services.audit_service import AuditService
    audit = AuditService(db)
    trail = audit.trail_for_case(case_id)
    return [
        {
            "event_id": e.id,
            "event_type": e.event_type,
            "previous_state": e.previous_state,
            "new_state": e.new_state,
            "timestamp": e.timestamp,
            "metadata": e.metadata_json,
        }
        for e in trail
    ]


@router.post("/seed", response_model=list[CaseListItem])
def seed_demo_cases(db: Session = Depends(get_db)):
    """Creates realistic input failure events and passes each through the real RecoveryOS pipeline.
    
    No actions or outcomes are hardcoded: profiling, policy, ML scoring, NIR ranking,
    and FSM execution run for each event genuinely.
    """
    demo_events = [
        PaymentFailureEvent(
            transaction_id="TXN-DEMO-EXPIRED",
            amount=4999.0,
            failure_code="CARD_EXPIRED",
            gateway_health_score=0.92,
            customer_tenure_days=420,
            previous_successful_payments=14,
            previous_failures=1,
            customer_id="CUST-4921",
        ),
        PaymentFailureEvent(
            transaction_id="TXN-DEMO-FRAUD",
            amount=15000.0,
            failure_code="FRAUD_SUSPECTED",
            gateway_health_score=0.88,
            customer_tenure_days=12,
            previous_successful_payments=0,
            previous_failures=2,
            customer_id="CUST-8812",
        ),
        PaymentFailureEvent(
            transaction_id="TXN-DEMO-TIMEOUT",
            amount=2499.0,
            failure_code="GATEWAY_TIMEOUT",
            gateway_health_score=0.95,
            customer_tenure_days=310,
            previous_successful_payments=9,
            previous_failures=0,
            customer_id="CUST-3310",
        ),
        PaymentFailureEvent(
            transaction_id="TXN-DEMO-RATELIMIT",
            amount=850.0,
            failure_code="RATE_LIMITED",
            gateway_health_score=0.12,
            customer_tenure_days=180,
            previous_successful_payments=3,
            previous_failures=1,
            customer_id="CUST-1904",
        ),
    ]

    orchestrator = CaseOrchestrator(db)
    created_cases: list[CaseListItem] = []

    for event in demo_events:
        case = orchestrator.create_case(event)
        decision = orchestrator.run_pipeline(case, event)
        created_cases.append(
            CaseListItem(
                id=case.id,
                transaction_id=case.transaction_id,
                customer_id=case.customer_id,
                amount=case.amount,
                currency=case.currency or "INR",
                failure_code=case.failure_code,
                failure_category=case.failure_category,
                state=CaseState(case.state),
                selected_action=ActionType(case.selected_action) if case.selected_action else None,
                is_recovered=bool(case.is_recovered),
                recovered_amount=case.recovered_amount,
                reevaluation_count=case.reevaluation_count or 0,
                next_evaluation_at=case.next_evaluation_at,
                created_at=case.created_at,
                updated_at=case.updated_at,
            )
        )

    return created_cases

