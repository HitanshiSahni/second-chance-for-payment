"""
Action Selection.

Combines policy-eligible actions with their scored evaluations and picks
the winner. Selection logic:

1. Among policy-allowed, scoreable actions (i.e. not HALT), pick the one
   with the highest NIR.
2. If that best NIR is still below `min_positive_nir_threshold`, no action
   currently clears the value bar -- fall back to WAIT if WAIT itself is
   allowed and the case hasn't exhausted its re-evaluation budget,
   otherwise HALT.
3. If WAIT is the highest-NIR action outright, that's a legitimate
   selection too (WAIT can itself be the best value action, e.g. an
   infra issue expected to self-resolve).

This is the ONLY function in the codebase allowed to produce a
`selected_action`. No other module is allowed to set it directly.
"""
from __future__ import annotations

from app.core.config import PolicyConfig
from app.domain.enums import ActionType
from app.domain.schemas import ActionEvaluation, DecisionExplanation, FailureCategory
from app.core.policy_engine import PolicyResult


def select_action(
    case_id: str,
    failure_category: FailureCategory,
    policy_result: PolicyResult,
    evaluations: list[ActionEvaluation],
    config: PolicyConfig,
    reevaluation_count: int,
    current_state,
) -> DecisionExplanation:
    threshold = config.nir.min_positive_nir_threshold

    positive_candidates = [e for e in evaluations if e.action != ActionType.WAIT and e.nir >= threshold]

    if positive_candidates:
        best = max(positive_candidates, key=lambda e: e.nir)
        reason = (
            f"Highest positive NIR ({best.nir:.2f}) among policy-eligible, "
            f"value-clearing actions"
        )
        selected = best.action
    else:
        wait_allowed = ActionType.WAIT in policy_result.allowed_actions
        budget_remaining = reevaluation_count < config.limits.max_reevaluations
        if wait_allowed and budget_remaining:
            selected = ActionType.WAIT
            reason = (
                "No action currently clears the minimum positive-NIR threshold "
                f"({threshold}); deferring to WAIT for re-evaluation "
                f"({reevaluation_count}/{config.limits.max_reevaluations} used)"
            )
        else:
            selected = ActionType.HALT
            reason = (
                "No positive-value action available and WAIT budget exhausted "
                if not budget_remaining
                else "No positive-value action available and WAIT not policy-eligible"
            )

    return DecisionExplanation(
        case_id=case_id,
        failure_category=failure_category,
        available_actions=policy_result.allowed_actions,
        blocked_actions=policy_result.blocked_actions,
        evaluations=evaluations,
        selected_action=selected,
        selection_reason=reason,
        current_state=current_state,
    )
