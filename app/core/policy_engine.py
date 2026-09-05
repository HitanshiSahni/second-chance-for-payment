"""
Policy & Compliance Gate.

100% deterministic, config-driven. This layer decides which actions are
even *eligible* for a case -- it never scores or ranks them. That job
belongs to services/action_evaluator.py. Keeping this boundary intact is
what stops "AI/ML from overriding policy" per the design brief.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta

from app.core.config import PolicyConfig
from app.domain.enums import ActionType, FailureCategory
from app.domain.schemas import PaymentFailureEvent


@dataclass
class PolicyResult:
    allowed_actions: list[ActionType]
    blocked_actions: dict[str, str] = field(default_factory=dict)


class PolicyEngine:
    def __init__(self, config: PolicyConfig):
        self.config = config

    def evaluate(
        self,
        event: PaymentFailureEvent,
        failure_category: FailureCategory,
        previous_attempts_this_case: int,
        previous_customer_interventions: int,
        last_customer_contact_at: datetime | None,
        case_created_at: datetime,
        now: datetime | None = None,
    ) -> PolicyResult:
        now = now or datetime.utcnow()
        limits = self.config.limits

        all_actions = list(ActionType)
        blocked: dict[str, str] = {}

        # --- Hard failure codes: nothing but HALT is eligible ---
        if event.failure_code in self.config.hard_failure_codes:
            for a in all_actions:
                if a != ActionType.HALT:
                    blocked[a.value] = f"Hard failure code '{event.failure_code}' blocks all recovery actions"
            return PolicyResult(allowed_actions=[ActionType.HALT], blocked_actions=blocked)

        # --- Recovery window expired ---
        window_expired = (now - case_created_at) > timedelta(hours=limits.max_recovery_window_hours)
        if window_expired:
            for a in all_actions:
                if a != ActionType.HALT:
                    blocked[a.value] = "Maximum recovery window exceeded"
            return PolicyResult(allowed_actions=[ActionType.HALT], blocked_actions=blocked)

        allowed: list[ActionType] = []

        # --- Retry-style actions (SILENT_RETRY / INFRASTRUCTURE_RECOVERY) ---
        retry_attempts_exhausted = previous_attempts_this_case >= limits.max_retry_attempts
        if retry_attempts_exhausted:
            blocked[ActionType.SILENT_RETRY.value] = f"Max retry attempts ({limits.max_retry_attempts}) reached"
            blocked[ActionType.INFRASTRUCTURE_RECOVERY.value] = f"Max retry attempts ({limits.max_retry_attempts}) reached"
        else:
            allowed.append(ActionType.SILENT_RETRY)
            if event.gateway_health_score >= self.config.gateway_health.min_health_for_infra_recovery:
                allowed.append(ActionType.INFRASTRUCTURE_RECOVERY)
            else:
                blocked[ActionType.INFRASTRUCTURE_RECOVERY.value] = (
                    f"Gateway health {event.gateway_health_score:.2f} below "
                    f"minimum {self.config.gateway_health.min_health_for_infra_recovery}"
                )

        # --- Customer resolution: cooldown + max interventions ---
        cooldown_ok = True
        if last_customer_contact_at is not None:
            cooldown_ok = (now - last_customer_contact_at) > timedelta(
                hours=limits.customer_contact_cooldown_hours
            )
        interventions_ok = previous_customer_interventions < limits.max_customer_interventions

        if not interventions_ok:
            blocked[ActionType.CUSTOMER_RESOLUTION.value] = (
                f"Max customer interventions ({limits.max_customer_interventions}) reached"
            )
        elif not cooldown_ok:
            blocked[ActionType.CUSTOMER_RESOLUTION.value] = "Customer contact cooldown has not expired"
        else:
            allowed.append(ActionType.CUSTOMER_RESOLUTION)

        # --- WAIT and HALT are always structurally eligible; the value
        # layer decides whether they're actually the best choice ---
        allowed.append(ActionType.WAIT)
        allowed.append(ActionType.HALT)

        return PolicyResult(allowed_actions=allowed, blocked_actions=blocked)
