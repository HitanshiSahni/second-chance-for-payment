"""
Case Orchestrator.

Wires together: FSM -> Failure Profiler -> Policy Engine -> Action
Evaluator -> Action Router -> Executor -> Audit Ledger, for a single case.
This is intentionally the only module that calls all of the above --
everything else stays narrowly scoped to its one job.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.core.config import PolicyConfig, get_policy_config
from app.core.policy_engine import PolicyEngine
from app.core.state_machine import RecoveryFSM
from app.domain.enums import ActionType, CaseState, EventType
from app.domain.models import Case, Execution
from app.domain.schemas import DecisionExplanation, PaymentFailureEvent
from app.services.action_evaluator import ActionEvaluator
from app.services.action_router import select_action
from app.services.audit_service import AuditService
from app.services.executors.gateway_executors import GatewayRecoveryExecutor, RetryExecutor
from app.services.executors.resolution_executor import ResolutionExecutor
from app.services.executors.wait_and_halt import HaltExecutor, WaitScheduler
from app.services.failure_profiler import FailureProfiler
from app.simulation.mock_gateway import MockPaymentGatewaySimulator


class CaseOrchestrator:
    def __init__(self, db: Session, config: PolicyConfig | None = None, gateway_seed: int | None = None):
        self.db = db
        self.config = config or get_policy_config()
        self.audit = AuditService(db)
        self.policy_engine = PolicyEngine(self.config)
        self.evaluator = ActionEvaluator(self.config)
        self.gateway = MockPaymentGatewaySimulator(seed=gateway_seed)

        self.executors = {
            ActionType.INFRASTRUCTURE_RECOVERY: GatewayRecoveryExecutor(self.gateway, self.config),
            ActionType.SILENT_RETRY: RetryExecutor(self.gateway, self.config),
            ActionType.CUSTOMER_RESOLUTION: ResolutionExecutor(self.gateway, self.config),
            ActionType.WAIT: WaitScheduler(self.config),
            ActionType.HALT: HaltExecutor(),
        }

    def create_case(self, event: PaymentFailureEvent) -> Case:
        case = Case(
            transaction_id=event.transaction_id,
            customer_id=event.customer_id,
            amount=event.amount,
            currency=event.currency,
            failure_code=event.failure_code,
            raw_event=event.model_dump(mode="json"),
            state=CaseState.PAYMENT_FAILED.value,
        )
        self.db.add(case)
        self.db.commit()
        self.db.refresh(case)

        self.audit.log(case.id, EventType.PAYMENT_FAILED, None, CaseState.PAYMENT_FAILED.value,
                        metadata={"transaction_id": event.transaction_id, "failure_code": event.failure_code})
        return case

    def _set_state(self, case: Case, new_state: CaseState) -> None:
        current = CaseState(case.state)
        RecoveryFSM.transition(current, new_state)  # raises if invalid
        case.state = new_state.value
        case.updated_at = datetime.utcnow()
        self.db.commit()

    def run_pipeline(self, case: Case, event: PaymentFailureEvent) -> DecisionExplanation:
        """Runs profiling -> policy -> evaluation -> selection -> execution
        for a case currently in PAYMENT_FAILED or RE_EVALUATE."""

        # PROFILING
        self._set_state(case, CaseState.PROFILING)
        failure_category = FailureProfiler.classify(event)
        case.failure_category = failure_category.value
        self.db.commit()
        self.audit.log(case.id, EventType.FAILURE_PROFILED, CaseState.PAYMENT_FAILED.value,
                        CaseState.PROFILING.value, metadata={"failure_category": failure_category.value})

        # POLICY CHECK
        self._set_state(case, CaseState.POLICY_CHECKED)
        previous_interventions = sum(
            1 for e in case.executions if e.action == ActionType.CUSTOMER_RESOLUTION.value
        )
        previous_attempts = sum(
            1 for e in case.executions
            if e.action in (ActionType.SILENT_RETRY.value, ActionType.INFRASTRUCTURE_RECOVERY.value)
        )
        last_contact = next(
            (e.executed_at for e in sorted(case.executions, key=lambda x: x.executed_at, reverse=True)
             if e.action == ActionType.CUSTOMER_RESOLUTION.value),
            None,
        )
        policy_result = self.policy_engine.evaluate(
            event=event,
            failure_category=failure_category,
            previous_attempts_this_case=previous_attempts,
            previous_customer_interventions=previous_interventions,
            last_customer_contact_at=last_contact,
            case_created_at=case.created_at,
        )
        self.audit.log(case.id, EventType.POLICY_EVALUATED, CaseState.POLICY_CHECKED.value,
                        CaseState.POLICY_CHECKED.value,
                        metadata={"allowed": [a.value for a in policy_result.allowed_actions],
                                  "blocked": policy_result.blocked_actions})

        # ACTION EVALUATION
        self._set_state(case, CaseState.ACTION_EVALUATED)
        evaluations = self.evaluator.evaluate(event, failure_category, policy_result.allowed_actions)
        self.audit.log(case.id, EventType.ACTIONS_SCORED, CaseState.ACTION_EVALUATED.value,
                        CaseState.ACTION_EVALUATED.value,
                        metadata={"evaluations": [e.model_dump() for e in evaluations]})

        # ACTION SELECTION
        decision = select_action(
            case_id=case.id,
            failure_category=failure_category,
            policy_result=policy_result,
            evaluations=evaluations,
            config=self.config,
            reevaluation_count=case.reevaluation_count,
            current_state=CaseState.ACTION_EVALUATED,
        )
        case.selected_action = decision.selected_action.value
        self.db.commit()
        self.audit.log(case.id, EventType.ACTION_SELECTED, CaseState.ACTION_EVALUATED.value,
                        CaseState.ACTION_EVALUATED.value,
                        metadata={"selected_action": decision.selected_action.value,
                                  "reason": decision.selection_reason})

        # ROUTE: WAIT / HALT / EXECUTE
        if decision.selected_action == ActionType.WAIT:
            self._handle_wait(case)
        elif decision.selected_action == ActionType.HALT:
            self._handle_halt(case, decision.selection_reason)
        else:
            self._execute_action(case, event, failure_category, decision.selected_action)

        decision.current_state = CaseState(case.state)
        case.latest_decision = decision.model_dump(mode="json")
        self.db.commit()

        return decision

    def _handle_wait(self, case: Case) -> None:
        self._set_state(case, CaseState.RE_EVALUATE)
        scheduler: WaitScheduler = self.executors[ActionType.WAIT]  # type: ignore
        next_eval = scheduler.next_evaluation_at()
        case.next_evaluation_at = next_eval
        case.reevaluation_count += 1
        self.db.commit()
        self.audit.log(case.id, EventType.WAIT_SCHEDULED, CaseState.ACTION_EVALUATED.value,
                        CaseState.RE_EVALUATE.value,
                        metadata={"next_evaluation_at": next_eval.isoformat(),
                                  "reevaluation_count": case.reevaluation_count})

    def _handle_halt(self, case: Case, reason: str) -> None:
        self._set_state(case, CaseState.HALTED)
        self.audit.log(case.id, EventType.CASE_HALTED, CaseState.ACTION_EVALUATED.value,
                        CaseState.HALTED.value, metadata={"reason": reason})

    def _execute_action(self, case: Case, event: PaymentFailureEvent, failure_category, action: ActionType) -> None:
        self._set_state(case, CaseState.EXECUTING)
        executor = self.executors[action]
        outcome = executor.execute(event, failure_category)

        execution = Execution(case_id=case.id, action=action.value,
                               outcome="SUCCESS" if outcome.success else "FAILURE",
                               cost=outcome.cost)
        self.db.add(execution)
        self.db.commit()

        self.audit.log(case.id, EventType.ACTION_EXECUTED, CaseState.EXECUTING.value,
                        CaseState.EXECUTING.value,
                        metadata={"action": action.value, "success": outcome.success, "detail": outcome.detail})

        self._set_state(case, CaseState.OUTCOME_CHECK)

        if outcome.success:
            case.is_recovered = True
            case.recovered_amount = event.amount
            self.db.commit()
            self._set_state(case, CaseState.RECOVERED)
            self.audit.log(case.id, EventType.PAYMENT_RECOVERED, CaseState.OUTCOME_CHECK.value,
                            CaseState.RECOVERED.value, metadata={"amount": event.amount})
        else:
            self.audit.log(case.id, EventType.ACTION_FAILED, CaseState.OUTCOME_CHECK.value,
                            None, metadata={"action": action.value})
            if case.reevaluation_count < self.config.limits.max_reevaluations:
                self._set_state(case, CaseState.RE_EVALUATE)
                case.reevaluation_count += 1
                self.db.commit()
                self.audit.log(case.id, EventType.CASE_RE_EVALUATED, CaseState.OUTCOME_CHECK.value,
                                CaseState.RE_EVALUATE.value, metadata={"reevaluation_count": case.reevaluation_count})
            else:
                self._set_state(case, CaseState.UNRECOVERABLE)
                self.audit.log(case.id, EventType.CASE_HALTED, CaseState.OUTCOME_CHECK.value,
                                CaseState.UNRECOVERABLE.value, metadata={"reason": "Re-evaluation budget exhausted"})

    def resume_case(self, case: Case, event: PaymentFailureEvent) -> DecisionExplanation:
        """Resume a case sitting in RE_EVALUATE back through evaluation/selection."""
        self._set_state(case, CaseState.ACTION_EVALUATED)
        return self.run_pipeline_from_action_evaluated(case, event)

    def run_pipeline_from_action_evaluated(self, case: Case, event: PaymentFailureEvent) -> DecisionExplanation:
        failure_category = FailureProfiler.classify(event)
        previous_interventions = sum(
            1 for e in case.executions if e.action == ActionType.CUSTOMER_RESOLUTION.value
        )
        previous_attempts = sum(
            1 for e in case.executions
            if e.action in (ActionType.SILENT_RETRY.value, ActionType.INFRASTRUCTURE_RECOVERY.value)
        )
        last_contact = next(
            (e.executed_at for e in sorted(case.executions, key=lambda x: x.executed_at, reverse=True)
             if e.action == ActionType.CUSTOMER_RESOLUTION.value),
            None,
        )
        event.previous_attempts = previous_attempts
        policy_result = self.policy_engine.evaluate(
            event=event, failure_category=failure_category,
            previous_attempts_this_case=previous_attempts,
            previous_customer_interventions=previous_interventions,
            last_customer_contact_at=last_contact,
            case_created_at=case.created_at,
        )
        self.audit.log(case.id, EventType.POLICY_EVALUATED, CaseState.ACTION_EVALUATED.value,
                        CaseState.ACTION_EVALUATED.value,
                        metadata={"allowed": [a.value for a in policy_result.allowed_actions],
                                  "blocked": policy_result.blocked_actions})

        evaluations = self.evaluator.evaluate(event, failure_category, policy_result.allowed_actions)
        self.audit.log(case.id, EventType.ACTIONS_SCORED, CaseState.ACTION_EVALUATED.value,
                        CaseState.ACTION_EVALUATED.value,
                        metadata={"evaluations": [e.model_dump() for e in evaluations]})

        decision = select_action(
            case_id=case.id, failure_category=failure_category, policy_result=policy_result,
            evaluations=evaluations, config=self.config,
            reevaluation_count=case.reevaluation_count, current_state=CaseState.ACTION_EVALUATED,
        )
        case.selected_action = decision.selected_action.value
        self.db.commit()
        self.audit.log(case.id, EventType.ACTION_SELECTED, CaseState.ACTION_EVALUATED.value,
                        CaseState.ACTION_EVALUATED.value,
                        metadata={"selected_action": decision.selected_action.value,
                                  "reason": decision.selection_reason})

        if decision.selected_action == ActionType.WAIT:
            self._handle_wait(case)
        elif decision.selected_action == ActionType.HALT:
            self._handle_halt(case, decision.selection_reason)
        else:
            self._execute_action(case, event, failure_category, decision.selected_action)

        decision.current_state = CaseState(case.state)
        case.latest_decision = decision.model_dump(mode="json")
        self.db.commit()
        return decision
