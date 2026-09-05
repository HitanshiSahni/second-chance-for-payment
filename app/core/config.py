"""
Central configuration loader.

Loads config/policy.yaml once and exposes it as a typed, importable object
so no module reaches for a magic number directly.
"""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

import yaml
from pydantic import BaseModel

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_POLICY_PATH = PROJECT_ROOT / "config" / "policy.yaml"
DEFAULT_DB_PATH = PROJECT_ROOT / "data" / "recoveryos.db"
DEFAULT_MODEL_PATH = PROJECT_ROOT / "data" / "model.joblib"
DEFAULT_TRAIN_DATA_PATH = PROJECT_ROOT / "data" / "historical_train.csv"
DEFAULT_EVAL_DATA_PATH = PROJECT_ROOT / "data" / "holdout_eval.csv"


class Limits(BaseModel):
    max_retry_attempts: int
    max_customer_interventions: int
    customer_contact_cooldown_hours: int
    max_recovery_window_hours: int
    max_reevaluations: int


class NirConfig(BaseModel):
    min_positive_nir_threshold: float


class WaitConfig(BaseModel):
    reevaluation_delay_minutes: int


class GatewayHealthConfig(BaseModel):
    min_health_for_infra_recovery: float


class PolicyConfig(BaseModel):
    limits: Limits
    costs: dict[str, float]
    nir: NirConfig
    wait: WaitConfig
    gateway_health: GatewayHealthConfig
    hard_failure_codes: list[str]


@lru_cache(maxsize=1)
def get_policy_config(path: str | None = None) -> PolicyConfig:
    config_path = Path(path) if path else Path(
        os.environ.get("RECOVERYOS_POLICY_PATH", DEFAULT_POLICY_PATH)
    )
    with open(config_path, "r") as f:
        raw = yaml.safe_load(f)
    return PolicyConfig(**raw)


def get_db_url() -> str:
    return os.environ.get("RECOVERYOS_DB_URL", f"sqlite:///{DEFAULT_DB_PATH}")
