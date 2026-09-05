"""
Batch Evaluation.

Runs a held-out batch of synthetic failed-payment events through:
  (a) RecoveryOS's full pipeline (diagnosis + policy + model-based NIR selection)
  (b) a Blind Retry baseline (always SILENT_RETRY, up to policy's max attempts,
      then HALT -- no diagnosis, no model, no cost-awareness)

and reports comparative metrics. The held-out batch uses a seed disjoint
from training and is scored by directly sampling the hidden environment
per selected action -- exactly mirroring what the mock gateway does inside
the live orchestrator, just without persisting full case/FSM state for
every one of potentially thousands of rows (that part is an optimization,
not a shortcut on the decision logic itself, which is identical to
services/orchestrator.py's action-evaluation path).
"""
from __future__ import annotations

from collections import Counter
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.config import get_policy_config
from app.core.policy_engine import PolicyEngine
from app.domain.enums import ActionType
from app.services.action_evaluator import ActionEvaluator
from app.services.action_router import select_action
from app.services.failure_profiler import FailureProfiler
from app.simulation.data_generator import generate_raw_events
from app.simulation.environment import sample_outcome
import numpy as np


def _run_recoveryos(events, config, rng) -> dict:
    policy_engine = PolicyEngine(config)
    evaluator = ActionEvaluator(config)

    total_at_risk = 0.0
    recovered_revenue = 0.0
    intervention_cost_total = 0.0
    customer_interventions = 0
    halted = 0
    action_counts = Counter()

    for event in events:
        total_at_risk += event.amount
        category = FailureProfiler.classify(event)
        policy_result = policy_engine.evaluate(
            event=event, failure_category=category,
            previous_attempts_this_case=0, previous_customer_interventions=0,
            last_customer_contact_at=None, case_created_at=datetime.utcnow(),
        )
        evaluations = evaluator.evaluate(event, category, policy_result.allowed_actions)
        decision = select_action(
            case_id=event.transaction_id, failure_category=category,
            policy_result=policy_result, evaluations=evaluations, config=config,
            reevaluation_count=0, current_state=None,
        )
        action = decision.selected_action
        action_counts[action.value] += 1

        if action == ActionType.HALT:
            halted += 1
            continue
        if action == ActionType.WAIT:
            # In the single-pass batch metric, WAIT contributes no immediate
            # recovery or cost; a full simulation would re-enter the loop at
            # next_evaluation_at. Counted separately in action_distribution.
            continue

        if action == ActionType.CUSTOMER_RESOLUTION:
            customer_interventions += 1

        cost = config.costs.get(action.value, 0.0)
        intervention_cost_total += cost
        success = sample_outcome(event, category, action, rng=rng)
        if success:
            recovered_revenue += event.amount

    net_recovered_value = recovered_revenue - intervention_cost_total

    return {
        "system": "RecoveryOS",
        "total_transactions": len(events),
        "total_at_risk_revenue": round(total_at_risk, 2),
        "recovered_revenue": round(recovered_revenue, 2),
        "recovery_rate": round(recovered_revenue / total_at_risk, 4) if total_at_risk else 0.0,
        "intervention_cost_total": round(intervention_cost_total, 2),
        "net_recovered_value": round(net_recovered_value, 2),
        "customer_interventions": customer_interventions,
        "halted_cases": halted,
        "action_distribution": dict(action_counts),
    }


def _run_blind_retry_baseline(events, config, rng) -> dict:
    """Naive baseline: always SILENT_RETRY, no diagnosis, no cost-awareness,
    up to policy's max_retry_attempts as a single immediate attempt (the
    baseline doesn't even respect cooldowns or interventions budgets --
    it just retries blindly once per case in this single-pass batch)."""
    total_at_risk = 0.0
    recovered_revenue = 0.0
    intervention_cost_total = 0.0
    action_counts = Counter()

    for event in events:
        total_at_risk += event.amount
        category = FailureProfiler.classify(event)
        action = ActionType.SILENT_RETRY
        action_counts[action.value] += 1
        cost = config.costs.get(action.value, 0.0)
        intervention_cost_total += cost
        success = sample_outcome(event, category, action, rng=rng)
        if success:
            recovered_revenue += event.amount

    net_recovered_value = recovered_revenue - intervention_cost_total
    return {
        "system": "Blind Retry Baseline",
        "total_transactions": len(events),
        "total_at_risk_revenue": round(total_at_risk, 2),
        "recovered_revenue": round(recovered_revenue, 2),
        "recovery_rate": round(recovered_revenue / total_at_risk, 4) if total_at_risk else 0.0,
        "intervention_cost_total": round(intervention_cost_total, 2),
        "net_recovered_value": round(net_recovered_value, 2),
        "customer_interventions": 0,
        "halted_cases": 0,
        "action_distribution": dict(action_counts),
    }


def run_batch_comparison(db: Session, n: int = 500, seed: int = 777) -> dict:
    config = get_policy_config()
    events = generate_raw_events(n=n, seed=seed)

    # Separate RNG streams per system so one system's random draws don't
    # shift the other's, while both draw from the SAME hidden environment
    # function for a fair comparison on the same underlying cases.
    recoveryos_rng = np.random.default_rng(seed * 2 + 1)
    baseline_rng = np.random.default_rng(seed * 2 + 2)

    recoveryos_result = _run_recoveryos(events, config, recoveryos_rng)
    baseline_result = _run_blind_retry_baseline(events, config, baseline_rng)

    improvement = recoveryos_result["net_recovered_value"] - baseline_result["net_recovered_value"]

    return {
        "recoveryos": recoveryos_result,
        "blind_retry_baseline": baseline_result,
        "net_recovered_value_improvement": round(improvement, 2),
    }
