"""
Failure Profiling / Root Cause Classification.

This mapping is deterministic BY DESIGN (interpreting gateway failure codes
is domain knowledge, not something worth training a model on with the data
we have). It classifies WHAT went wrong. It has no opinion on what to do
about it -- that separation is enforced by simply not importing ActionType
anywhere in this file.
"""
from __future__ import annotations

from app.domain.enums import FailureCategory
from app.domain.schemas import PaymentFailureEvent

# Taxonomy: failure_code -> FailureCategory.
# In production this would be a versioned table per-gateway; a flat dict
# is sufficient for the hackathon scope.
_FAILURE_CODE_MAP: dict[str, FailureCategory] = {
    "GATEWAY_TIMEOUT": FailureCategory.INFRASTRUCTURE_TRANSIENT,
    "GATEWAY_UNAVAILABLE": FailureCategory.INFRASTRUCTURE_TRANSIENT,
    "NETWORK_ERROR": FailureCategory.INFRASTRUCTURE_TRANSIENT,
    "RATE_LIMITED": FailureCategory.INFRASTRUCTURE_TRANSIENT,

    "INSUFFICIENT_FUNDS": FailureCategory.TEMPORARY_PAYMENT_ISSUE,
    "ISSUER_DECLINED_SOFT": FailureCategory.TEMPORARY_PAYMENT_ISSUE,
    "BANK_SERVER_ERROR": FailureCategory.TEMPORARY_PAYMENT_ISSUE,

    "CARD_EXPIRED": FailureCategory.PAYMENT_METHOD_ISSUE,
    "CARD_INVALID": FailureCategory.PAYMENT_METHOD_ISSUE,
    "MANDATE_EXPIRED": FailureCategory.PAYMENT_METHOD_ISSUE,
    "CVV_MISMATCH": FailureCategory.PAYMENT_METHOD_ISSUE,

    "3DS_AUTHENTICATION_REQUIRED": FailureCategory.CUSTOMER_ACTION_REQUIRED,
    "OTP_FAILED": FailureCategory.CUSTOMER_ACTION_REQUIRED,
    "ISSUER_DECLINED_HARD": FailureCategory.CUSTOMER_ACTION_REQUIRED,

    "CARD_REPORTED_LOST_OR_STOLEN": FailureCategory.HARD_UNRECOVERABLE,
    "ACCOUNT_CLOSED": FailureCategory.HARD_UNRECOVERABLE,
    "FRAUD_SUSPECTED": FailureCategory.HARD_UNRECOVERABLE,
}


class FailureProfiler:
    @staticmethod
    def classify(event: PaymentFailureEvent) -> FailureCategory:
        return _FAILURE_CODE_MAP.get(event.failure_code, FailureCategory.UNKNOWN)
