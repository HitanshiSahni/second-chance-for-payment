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

import os
import argparse

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss, roc_auc_score, accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.core.config import DEFAULT_TRAIN_DATA_PATH
from app.ml.feature_engineering import FEATURE_NAMES, add_interaction_features
from app.ml.model_registry import save_model
from app.simulation.data_generator import generate_dataset


def _load_or_generate(n: int, seed: int, path: str, force_generate: bool = False) -> pd.DataFrame:
    if os.path.exists(path) and not force_generate:
        df = pd.read_csv(path)
        df = add_interaction_features(df)
        return df

    df = generate_dataset(n=n, seed=seed, logging_policy="random")
    df = add_interaction_features(df)
    df.to_csv(path, index=False)
    return df


def train(n_samples: int = 10000, seed: int = 42, force_generate: bool = False) -> dict:
    df = _load_or_generate(n_samples, seed, str(DEFAULT_TRAIN_DATA_PATH), force_generate=force_generate)

    X = df[FEATURE_NAMES].values
    y = df["recovered"].values

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=seed, stratify=y
    )

    pipeline = Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "clf",
                LogisticRegression(
                    C=1.0,
                    max_iter=1000,
                    random_state=seed,
                    penalty="l2",
                ),
            ),
        ]
    )
    pipeline.fit(X_train, y_train)

    val_probs = pipeline.predict_proba(X_val)[:, 1]
    val_preds = (val_probs >= 0.5).astype(int)

    metrics = {
        "n_train": int(len(X_train)),
        "n_val": int(len(X_val)),
        "val_auc": float(roc_auc_score(y_val, val_probs)),
        "val_accuracy_at_0_5": float(accuracy_score(y_val, val_preds)),
        "val_log_loss": float(log_loss(y_val, val_probs)),
        "val_brier_score": float(brier_score_loss(y_val, val_probs)),
        "base_recovery_rate": float(np.mean(y)),
    }

    save_model(pipeline)
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
