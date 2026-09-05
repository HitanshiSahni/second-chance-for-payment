"""
Train the action-conditioned recovery-probability model.

Approach: an S-learner. One GradientBoostingClassifier is trained on rows
of (features_including_action) -> recovered (0/1), using historical data
where the action was assigned by a RANDOMIZED logging policy (see
simulation/data_generator.py). At inference time we call the same model
once per candidate action and read off P(recovery | context, action),
including action=WAIT as the no-intervention baseline.

Why an S-learner instead of full causal machinery (T-learner / X-learner /
doubly-robust) for this hackathon: with randomized historical action
assignment, a single well-regularized classifier that includes the action
as a feature already gives an unbiased-in-expectation estimate of
P(recovery | context, action) -- that's the quantity Delta_P needs. Going
to a T-learner (separate model per action) or X-learner buys robustness to
model misspecification and heterogeneous treatment effects, at the cost of
needing 4x the per-action data to reach the same variance, which we don't
have in a 2-night synthetic dataset. This is documented here rather than
silently assumed.
"""
from __future__ import annotations

import argparse

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import brier_score_loss, log_loss, roc_auc_score
from sklearn.model_selection import train_test_split

from app.core.config import DEFAULT_TRAIN_DATA_PATH
from app.ml.feature_engineering import FEATURE_NAMES
from app.ml.model_registry import save_model
from app.simulation.data_generator import generate_dataset


def _load_or_generate(n: int, seed: int, path: str) -> pd.DataFrame:
    df = generate_dataset(n=n, seed=seed, logging_policy="random")
    df.to_csv(path, index=False)
    return df


def train(n_samples: int = 20000, seed: int = 42) -> dict:
    df = _load_or_generate(n_samples, seed, str(DEFAULT_TRAIN_DATA_PATH))

    X = df[FEATURE_NAMES].values
    y = df["recovered"].values

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=seed, stratify=y
    )

    model = GradientBoostingClassifier(
        n_estimators=150,
        max_depth=3,
        learning_rate=0.05,
        subsample=0.8,
        random_state=seed,
    )
    model.fit(X_train, y_train)

    val_probs = model.predict_proba(X_val)[:, 1]
    metrics = {
        "n_train": int(len(X_train)),
        "n_val": int(len(X_val)),
        "val_auc": float(roc_auc_score(y_val, val_probs)),
        "val_log_loss": float(log_loss(y_val, val_probs)),
        "val_brier_score": float(brier_score_loss(y_val, val_probs)),
        "base_recovery_rate": float(np.mean(y)),
    }

    save_model(model)
    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--n_samples", type=int, default=20000)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    metrics = train(n_samples=args.n_samples, seed=args.seed)
    print("Training complete. Model frozen and saved.")
    for k, v in metrics.items():
        print(f"  {k}: {v}")
