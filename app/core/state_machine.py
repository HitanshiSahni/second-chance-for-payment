"""
RecoveryOS finite state machine.

Every transition is validated against an explicit table. Calling
`transition()` with an invalid (from_state, to_state) pair raises
InvalidTransitionError instead of silently mutating state -- this is what
"invalid transitions should not be possible" means in practice.
"""
from __future__ import annotations

from app.domain.enums import CaseState, TERMINAL_STATES

# Explicit adjacency list: from_state -> set of valid next states.
_TRANSITIONS: dict[CaseState, set[CaseState]] = {
    CaseState.PAYMENT_FAILED: {CaseState.PROFILING},
    CaseState.PROFILING: {CaseState.POLICY_CHECKED},
    CaseState.POLICY_CHECKED: {CaseState.ACTION_EVALUATED},
    CaseState.ACTION_EVALUATED: {
        CaseState.EXECUTING,   # INFRASTRUCTURE_RECOVERY / SILENT_RETRY / CUSTOMER_RESOLUTION
        CaseState.RE_EVALUATE,  # WAIT: scheduled, no gateway execution yet
        CaseState.HALTED,      # HALT
    },
    CaseState.EXECUTING: {CaseState.OUTCOME_CHECK},
    CaseState.OUTCOME_CHECK: {
        CaseState.RECOVERED,
        CaseState.RE_EVALUATE,
        CaseState.HALTED,
        CaseState.UNRECOVERABLE,
    },
    CaseState.RE_EVALUATE: {CaseState.ACTION_EVALUATED, CaseState.HALTED},
    CaseState.RECOVERED: set(),
    CaseState.HALTED: set(),
    CaseState.UNRECOVERABLE: set(),
}


class InvalidTransitionError(Exception):
    pass


class RecoveryFSM:
    """Stateless validator + transition executor for a single case."""

    @staticmethod
    def valid_next_states(current: CaseState) -> set[CaseState]:
        return _TRANSITIONS.get(current, set())

    @classmethod
    def can_transition(cls, from_state: CaseState, to_state: CaseState) -> bool:
        return to_state in cls.valid_next_states(from_state)

    @classmethod
    def transition(cls, from_state: CaseState, to_state: CaseState) -> CaseState:
        if not cls.can_transition(from_state, to_state):
            raise InvalidTransitionError(
                f"Cannot transition from {from_state} to {to_state}. "
                f"Valid targets: {sorted(s.value for s in cls.valid_next_states(from_state))}"
            )
        return to_state

    @staticmethod
    def is_terminal(state: CaseState) -> bool:
        return state in TERMINAL_STATES
