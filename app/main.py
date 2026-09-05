from __future__ import annotations

from fastapi import FastAPI

from app.api.routes import cases, evaluation
from app.core.db import init_db

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="RecoveryOS",
    description=(
        "Intelligent Payment Failure Recovery Orchestrator. "
        "Diagnosis + policy constraints + model-based NIR action selection."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(cases.router)
app.include_router(evaluation.router)
