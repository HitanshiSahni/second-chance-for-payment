"""
Intelligent Action Evaluation.

For each policy-eligible action, estimate Delta_P (incremental recovery
probability vs. the WAIT/no-intervention baseline) and compute NIR (Net
Incremental Recovery value). This is the only place model probabilities
turn into money. HALT is not scored here: it has no recovery probability
by definition, it's what the router falls back to when nothing else
clears the value bar.
"""
from __future__ import annotations

from app.core.config import PolicyConfig
from app.domain.enums import ActionType, FailureCategory
from app.domain.schemas import ActionEvaluation, PaymentFailureEvent
from app.ml.inference import predict_recovery_probabilities


class ActionEvaluator:
    def __init__(self, config: PolicyConfig):
        self.config = config

    def evaluate(
        self,
        event: PaymentFailureEvent,
        failure_category: FailureCategory,
        allowed_actions: list[ActionType],
    ) -> list[ActionEvaluation]:
        probs = predict_recovery_probabilities(event, failure_category)
        baseline = probs[ActionType.WAIT]

        evaluations: list[ActionEvaluation] = []
        for action in allowed_actions:
            if action == ActionType.HALT:
                continue  # scored implicitly as "0 value, 0 cost" by the router
            p = probs[action]
            delta_p = p - baseline
            cost = self.config.costs.get(action.value, 0.0)
            nir = (delta_p * event.amount) - cost

            evaluations.append(
                ActionEvaluation(
                    action=action,
                    predicted_recovery_probability=p,
                    baseline_probability=baseline,
                    delta_p=delta_p,
                    transaction_value=event.amount,
                    intervention_cost=cost,
                    nir=nir,
                )
            )
        return evaluations
