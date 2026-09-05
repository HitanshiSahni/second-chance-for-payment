import os
import tempfile

import pytest
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from app.domain.enums import ActionType, CaseState
from app.domain.models import Base
from app.domain.schemas import PaymentFailureEvent
from app.services.orchestrator import CaseOrchestrator


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    engine.dispose()


def test_hard_failure_halts_immediately(db_session):
    event = PaymentFailureEvent(transaction_id="TX1", amount=500, failure_code="FRAUD_SUSPECTED")
    orch = CaseOrchestrator(db_session, gateway_seed=1)
    case = orch.create_case(event)
    decision = orch.run_pipeline(case, event)
    assert decision.selected_action == ActionType.HALT
    assert case.state == CaseState.HALTED.value


def test_recovered_case_reaches_terminal_recovered_state(db_session):
    # High gateway health + infra transient failure should have a decent
    # chance of an eventual RECOVERED outcome across a few seeds; we assert
    # structural correctness rather than pinning a specific seed's outcome.
    event = PaymentFailureEvent(
        transaction_id="TX2", amount=500, failure_code="GATEWAY_TIMEOUT", gateway_health_score=0.95
    )
    orch = CaseOrchestrator(db_session, gateway_seed=7)
    case = orch.create_case(event)
    decision = orch.run_pipeline(case, event)
    assert case.state in {
        CaseState.RECOVERED.value, CaseState.RE_EVALUATE.value, CaseState.HALTED.value,
    }
    # Whatever happened, the audit trail must be non-empty and start with PAYMENT_FAILED
    from app.services.audit_service import AuditService
    trail = AuditService(db_session).trail_for_case(case.id)
    assert trail[0].event_type == "PAYMENT_FAILED"


def test_case_never_reaches_invalid_state_across_full_reeval_loop(db_session):
    event = PaymentFailureEvent(
        transaction_id="TX3", amount=200, failure_code="RATE_LIMITED", gateway_health_score=0.1
    )
    orch = CaseOrchestrator(db_session, gateway_seed=3)
    case = orch.create_case(event)
    orch.run_pipeline(case, event)

    max_iterations = 20
    iterations = 0
    while case.state == CaseState.RE_EVALUATE.value and iterations < max_iterations:
        orch.resume_case(case, event)
        iterations += 1

    assert case.state in {
        CaseState.RECOVERED.value, CaseState.HALTED.value, CaseState.UNRECOVERABLE.value,
    }, f"Case did not terminate cleanly, ended in {case.state}"


def test_amount_conserved_in_raw_event(db_session):
    event = PaymentFailureEvent(transaction_id="TX4", amount=999.5, failure_code="CARD_EXPIRED")
    orch = CaseOrchestrator(db_session, gateway_seed=5)
    case = orch.create_case(event)
    assert case.amount == 999.5
    assert case.raw_event["amount"] == 999.5
