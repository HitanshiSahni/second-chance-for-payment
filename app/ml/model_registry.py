"""Thin save/load wrapper around joblib so training and inference agree on
where the frozen model artifact lives."""
from __future__ import annotations

from pathlib import Path

import joblib

from app.core.config import DEFAULT_MODEL_PATH


def save_model(model, path: str | Path = DEFAULT_MODEL_PATH) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, path)


def load_model(path: str | Path = DEFAULT_MODEL_PATH):
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(
            f"No trained model found at {path}. Run `python -m app.ml.train` first."
        )
    return joblib.load(path)
