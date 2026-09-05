"""SQLAlchemy ORM models. SQLite-backed for hackathon simplicity."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def _uuid() -> str:
    return str(uuid.uuid4())


class Case(Base):
    """A payment-failure recovery case tracked through the FSM."""

    __tablename__ = "cases"

    id = Column(String, primary_key=True, default=_uuid)
    transaction_id = Column(String, index=True, nullable=False)
    customer_id = Column(String, index=True)

    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    failure_code = Column(String, nullable=False)

    raw_event = Column(JSON, nullable=False)  # the original PaymentFailureEvent

    failure_category = Column(String, nullable=True)
    state = Column(String, nullable=False, default="PAYMENT_FAILED")

    selected_action = Column(String, nullable=True)
    resolution_type = Column(String, nullable=True)

    reevaluation_count = Column(Integer, default=0)
    next_evaluation_at = Column(DateTime, nullable=True)

    is_recovered = Column(Boolean, default=False)
    recovered_amount = Column(Float, nullable=True)
    latest_decision = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    events = relationship("AuditEvent", back_populates="case", cascade="all, delete-orphan")
    executions = relationship("Execution", back_populates="case", cascade="all, delete-orphan")


class AuditEvent(Base):
    """Append-only decision ledger. Every state transition is logged here."""

    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, default=_uuid)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)

    event_type = Column(String, nullable=False)
    previous_state = Column(String, nullable=True)
    new_state = Column(String, nullable=True)

    metadata_json = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="events")


class Execution(Base):
    """Record of an action actually executed via the mock gateway."""

    __tablename__ = "executions"

    id = Column(String, primary_key=True, default=_uuid)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)

    action = Column(String, nullable=False)
    outcome = Column(String, nullable=False)  # SUCCESS / FAILURE
    cost = Column(Float, default=0.0)
    executed_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="executions")
