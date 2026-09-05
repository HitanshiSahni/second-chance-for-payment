import pytest

from app.core.config import get_policy_config
from app.core.policy_engine import PolicyEngine
from app.core.state_machine import InvalidTransitionError, RecoveryFSM
from app.domain.enums import ActionType, CaseState, FailureCategory
from app.domain.schemas import PaymentFailureEvent
from app.services.action_evaluator import ActionEvaluator
from app.services.failure_profiler import FailureProfiler
from datetime import datetime, timedelta


def test_fsm_valid_transition():
    assert RecoveryFSM.transition(CaseState.PAYMENT_FAILED, CaseState.PROFILING) == CaseState.PROFILING


def test_fsm_invalid_transition_raises():
    with pytest.raises(InvalidTransitionError):
        RecoveryFSM.transition(CaseState.PAYMENT_FAILED, CaseState.RECOVERED)


def test_fsm_terminal_states_have_no_exits():
    for terminal in (CaseState.RECOVERED, CaseState.HALTED, CaseState.UNRECOVERABLE):
        assert RecoveryFSM.valid_next_states(terminal) == set()


def test_failure_profiler_known_code():
    event = PaymentFailureEvent(transaction_id="T1", amount=100, failure_code="GATEWAY_TIMEOUT")
    assert FailureProfiler.classify(event) == FailureCategory.INFRASTRUCTURE_TRANSIENT


def test_failure_profiler_unknown_code():
    event = PaymentFailureEvent(transaction_id="T2", amount=100, failure_code="SOME_NEW_CODE")
    assert FailureProfiler.classify(event) == FailureCategory.UNKNOWN


def test_policy_hard_failure_blocks_everything_but_halt():
    config = get_policy_config()
    engine = PolicyEngine(config)
    event = PaymentFailureEvent(transaction_id="T3", amount=100, failure_code="FRAUD_SUSPECTED")
    result = engine.evaluate(
        event=event, failure_category=FailureCategory.HARD_UNRECOVERABLE,
        previous_attempts_this_case=0, previous_customer_interventions=0,
        last_customer_contact_at=None, case_created_at=datetime.utcnow(),
    )
    assert result.allowed_actions == [ActionType.HALT]


def test_policy_retry_exhaustion_blocks_retry_actions():
    config = get_policy_config()
    engine = PolicyEngine(config)
    event = PaymentFailureEvent(transaction_id="T4", amount=100, failure_code="GATEWAY_TIMEOUT")
    result = engine.evaluate(
        event=event, failure_category=FailureCategory.INFRASTRUCTURE_TRANSIENT,
        previous_attempts_this_case=config.limits.max_retry_attempts,
        previous_customer_interventions=0,
        last_customer_contact_at=None, case_created_at=datetime.utcnow(),
    )
    assert ActionType.SILENT_RETRY not in result.allowed_actions
    assert ActionType.INFRASTRUCTURE_RECOVERY not in result.allowed_actions
    assert ActionType.SILENT_RETRY.value in result.blocked_actions


def test_policy_cooldown_blocks_customer_resolution():
    config = get_policy_config()
    engine = PolicyEngine(config)
    event = PaymentFailureEvent(transaction_id="T5", amount=100, failure_code="CARD_EXPIRED")
    recent_contact = datetime.utcnow() - timedelta(hours=1)
    result = engine.evaluate(
        event=event, failure_category=FailureCategory.PAYMENT_METHOD_ISSUE,
        previous_attempts_this_case=0, previous_customer_interventions=0,
        last_customer_contact_at=recent_contact, case_created_at=datetime.utcnow(),
    )
    assert ActionType.CUSTOMER_RESOLUTION not in result.allowed_actions


def test_policy_recovery_window_expired_forces_halt():
    config = get_policy_config()
    engine = PolicyEngine(config)
    event = PaymentFailureEvent(transaction_id="T6", amount=100, failure_code="GATEWAY_TIMEOUT")
    old_created_at = datetime.utcnow() - timedelta(hours=config.limits.max_recovery_window_hours + 1)
    result = engine.evaluate(
        event=event, failure_category=FailureCategory.INFRASTRUCTURE_TRANSIENT,
        previous_attempts_this_case=0, previous_customer_interventions=0,
        last_customer_contact_at=None, case_created_at=old_created_at,
    )
    assert result.allowed_actions == [ActionType.HALT]


def test_action_evaluator_produces_delta_p_and_nir():
    config = get_policy_config()
    evaluator = ActionEvaluator(config)
    event = PaymentFailureEvent(transaction_id="T7", amount=1000, failure_code="CARD_EXPIRED")
    evaluations = evaluator.evaluate(
        event, FailureCategory.PAYMENT_METHOD_ISSUE,
        [ActionType.SILENT_RETRY, ActionType.CUSTOMER_RESOLUTION, ActionType.WAIT],
    )
    actions_scored = {e.action for e in evaluations}
    assert actions_scored == {ActionType.SILENT_RETRY, ActionType.CUSTOMER_RESOLUTION, ActionType.WAIT}
    for e in evaluations:
        assert e.nir == pytest.approx(e.delta_p * e.transaction_value - e.intervention_cost)
        # WAIT is the baseline itself: delta_p must be exactly zero
    wait_eval = next(e for e in evaluations if e.action == ActionType.WAIT)
    assert wait_eval.delta_p == 0.0


def test_model_evaluation_metrics_and_calibration():
    from app.ml.evaluate import evaluate_model
    results = evaluate_model()
    assert results["n_val"] == 2000
    assert 0.70 <= results["metrics"]["roc_auc"] <= 0.85
    assert 0.10 <= results["metrics"]["brier_score"] <= 0.25
    assert 0.40 <= results["metrics"]["log_loss"] <= 0.70
    assert 0.65 <= results["metrics"]["accuracy_at_0_5"] <= 0.85
    assert "expected_calibration_error" in results["calibration"]
    assert len(results["feature_importances"]) > 0

