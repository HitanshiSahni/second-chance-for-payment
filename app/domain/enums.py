"""
Closed vocabularies used across RecoveryOS.

Keeping these as enums (rather than free strings scattered through the
codebase) is what lets the policy engine, FSM, and ML layer all agree on
what a valid value even is, and lets us validate transitions structurally
instead of by string comparison.
"""
from enum import Enum


class FailureCategory(str, Enum):
    """Root-cause classification produced by the failure profiler.

    This is a *diagnosis*, not a decision. It intentionally has no
    one-to-one mapping to an action.
    """
    INFRASTRUCTURE_TRANSIENT = "INFRASTRUCTURE_TRANSIENT"
    TEMPORARY_PAYMENT_ISSUE = "TEMPORARY_PAYMENT_ISSUE"
    PAYMENT_METHOD_ISSUE = "PAYMENT_METHOD_ISSUE"
    CUSTOMER_ACTION_REQUIRED = "CUSTOMER_ACTION_REQUIRED"
    HARD_UNRECOVERABLE = "HARD_UNRECOVERABLE"
    UNKNOWN = "UNKNOWN"


class ActionType(str, Enum):
    """The full action space RecoveryOS can choose from."""
    INFRASTRUCTURE_RECOVERY = "INFRASTRUCTURE_RECOVERY"
    SILENT_RETRY = "SILENT_RETRY"
    WAIT = "WAIT"
    CUSTOMER_RESOLUTION = "CUSTOMER_RESOLUTION"
    HALT = "HALT"


class ResolutionType(str, Enum):
    """Sub-types of CUSTOMER_RESOLUTION."""
    UPDATE_PAYMENT_METHOD = "UPDATE_PAYMENT_METHOD"
    PAYMENT_RETRY_LINK = "PAYMENT_RETRY_LINK"
    PAYMENT_PLAN_OFFER = "PAYMENT_PLAN_OFFER"


class CaseState(str, Enum):
    """FSM states. See core/state_machine.py for the transition table."""
    PAYMENT_FAILED = "PAYMENT_FAILED"
    PROFILING = "PROFILING"
    POLICY_CHECKED = "POLICY_CHECKED"
    ACTION_EVALUATED = "ACTION_EVALUATED"
    EXECUTING = "EXECUTING"
    OUTCOME_CHECK = "OUTCOME_CHECK"
    RE_EVALUATE = "RE_EVALUATE"
    RECOVERED = "RECOVERED"
    HALTED = "HALTED"
    UNRECOVERABLE = "UNRECOVERABLE"


TERMINAL_STATES = {CaseState.RECOVERED, CaseState.HALTED, CaseState.UNRECOVERABLE}


class EventType(str, Enum):
    PAYMENT_FAILED = "PAYMENT_FAILED"
    FAILURE_PROFILED = "FAILURE_PROFILED"
    POLICY_EVALUATED = "POLICY_EVALUATED"
    ACTIONS_FILTERED = "ACTIONS_FILTERED"
    ACTIONS_SCORED = "ACTIONS_SCORED"
    ACTION_SELECTED = "ACTION_SELECTED"
    ACTION_EXECUTED = "ACTION_EXECUTED"
    PAYMENT_RECOVERED = "PAYMENT_RECOVERED"
    ACTION_FAILED = "ACTION_FAILED"
    WAIT_SCHEDULED = "WAIT_SCHEDULED"
    CASE_HALTED = "CASE_HALTED"
    CASE_RE_EVALUATED = "CASE_RE_EVALUATED"


class PaymentType(str, Enum):
    ONE_TIME = "ONE_TIME"
    RECURRING = "RECURRING"


class Gateway(str, Enum):
    GATEWAY_A = "GATEWAY_A"
    GATEWAY_B = "GATEWAY_B"
    GATEWAY_C = "GATEWAY_C"
