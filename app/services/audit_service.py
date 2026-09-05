"""
Audit / Decision Ledger.

Every important state transition gets written here. This is what lets us
reconstruct exactly why a decision happened after the fact -- the audit
trail is a first-class deliverable of the system, not an afterthought log.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.domain.enums import EventType
from app.domain.models import AuditEvent


class AuditService:
    def __init__(self, db: Session):
        self.db = db

    def log(
        self,
        case_id: str,
        event_type: EventType,
        previous_state: str | None,
        new_state: str | None,
        metadata: dict | None = None,
    ) -> AuditEvent:
        event = AuditEvent(
            case_id=case_id,
            event_type=event_type.value,
            previous_state=previous_state,
            new_state=new_state,
            metadata_json=metadata or {},
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def trail_for_case(self, case_id: str) -> list[AuditEvent]:
        return (
            self.db.query(AuditEvent)
            .filter(AuditEvent.case_id == case_id)
            .order_by(AuditEvent.timestamp.asc())
            .all()
        )
