from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.evaluation.batch_runner import run_batch_comparison

router = APIRouter(prefix="/evaluation", tags=["evaluation"])


@router.post("/run")
def run_evaluation(n: int = 500, seed: int = 777, db: Session = Depends(get_db)):
    """Run RecoveryOS vs. a Blind Retry baseline on a fresh held-out batch."""
    return run_batch_comparison(db, n=n, seed=seed)
