"""
Model evaluation module and script.

Reproducibly evaluates the action-conditioned recovery probability estimator
(GradientBoostingClassifier S-Learner) on held-out validation data.
Derives all metrics dynamically from the actual frozen model and dataset.
"""
from __future__ import annotations

import argparse
from typing import Any

import numpy as np
import pandas as pd
from sklearn.calibration import calibration_curve
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    log_loss,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split

from app.core.config import DEFAULT_MODEL_PATH, DEFAULT_TRAIN_DATA_PATH
from app.ml.feature_engineering import FEATURE_NAMES, add_interaction_features
from app.ml.model_registry import load_model


def compute_calibration_bins(
    y_true: np.ndarray, y_prob: np.ndarray, n_bins: int = 5
) -> dict[str, Any]:
    """Lightweight empirical reliability check across probability bins."""
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    bin_indices = np.digitize(y_prob, bins) - 1
    total = len(y_true)

    bin_data = []
    ece = 0.0

    for b in range(n_bins):
        idx = bin_indices == b
        count = int(np.sum(idx))
        if count > 0:
            bin_acc = float(np.mean(y_true[idx]))
            bin_conf = float(np.mean(y_prob[idx]))
            gap = abs(bin_acc - bin_conf)
            weight = count / total
            ece += weight * gap
            bin_data.append(
                {
                    "bin_range": f"{bins[b]:.1f}-{bins[b+1]:.1f}",
                    "count": count,
                    "mean_predicted_prob": round(bin_conf, 4),
                    "actual_recovery_rate": round(bin_acc, 4),
                    "absolute_gap": round(gap, 4),
                }
            )

    return {
        "expected_calibration_error": round(float(ece), 4),
        "bins": bin_data,
    }


def evaluate_model(
    data_path: str = str(DEFAULT_TRAIN_DATA_PATH),
    model_path: str = str(DEFAULT_MODEL_PATH),
    test_size: float = 0.2,
    seed: int = 42,
    threshold: float = 0.5,
) -> dict[str, Any]:
    """Run evaluation on the held-out validation split of the dataset.

    Returns exact metrics derived from the model artifact and dataset.
    """
    df = pd.read_csv(data_path, low_memory=False)
    df = add_interaction_features(df)
    X = df[FEATURE_NAMES].values
    y = df["recovered"].values

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=test_size, random_state=seed, stratify=y
    )

    model = load_model(model_path)
    probs_val = model.predict_proba(X_val)[:, 1]
    preds_val = (probs_val >= threshold).astype(int)

    cm = confusion_matrix(y_val, preds_val)

    clf = model.named_steps["clf"] if hasattr(model, "named_steps") else model
    if hasattr(clf, "feature_importances_"):
        weights = clf.feature_importances_
    elif hasattr(clf, "coef_"):
        weights = clf.coef_[0]
    else:
        weights = np.zeros(len(FEATURE_NAMES))

    abs_weights = np.abs(weights)
    sorted_indices = np.argsort(abs_weights)[::-1]
    fi = {FEATURE_NAMES[i]: round(float(weights[i]), 4) for i in sorted_indices}

    calibration_info = compute_calibration_bins(y_val, probs_val, n_bins=5)

    return {
        "dataset_size": int(len(df)),
        "n_train": int(len(X_train)),
        "n_val": int(len(X_val)),
        "class_balance": {
            "recovered_rate": round(float(np.mean(y)), 4),
            "failed_rate": round(float(1.0 - np.mean(y)), 4),
        },
        "metrics": {
            "roc_auc": round(float(roc_auc_score(y_val, probs_val)), 4),
            "brier_score": round(float(brier_score_loss(y_val, probs_val)), 4),
            "log_loss": round(float(log_loss(y_val, probs_val)), 4),
            "accuracy_at_0_5": round(float(accuracy_score(y_val, preds_val)), 4),
            "precision_at_0_5": round(float(precision_score(y_val, preds_val, zero_division=0)), 4),
            "recall_at_0_5": round(float(recall_score(y_val, preds_val, zero_division=0)), 4),
            "f1_at_0_5": round(float(f1_score(y_val, preds_val, zero_division=0)), 4),
        },
        "confusion_matrix": {
            "true_negatives": int(cm[0, 0]),
            "false_positives": int(cm[0, 1]),
            "false_negatives": int(cm[1, 0]),
            "true_positives": int(cm[1, 1]),
        },
        "calibration": calibration_info,
        "feature_importances": fi,
    }


def print_evaluation_report(results: dict[str, Any]) -> None:
    print("\n" + "=" * 60)
    print("RECOVERYOS MODEL EVALUATION REPORT")
    print("=" * 60)
    print(f"Total Dataset Samples: {results['dataset_size']}")
    print(f"Train Samples:         {results['n_train']} (80%)")
    print(f"Validation Samples:    {results['n_val']} (20% held-out)")
    print(f"Class Balance:         Recovered={results['class_balance']['recovered_rate']:.2%}, Failed={results['class_balance']['failed_rate']:.2%}")

    m = results["metrics"]
    print("\n--- Probabilistic & Ranking Metrics ---")
    print(f"ROC-AUC Score:         {m['roc_auc']:.4f}")
    print(f"Brier Score:           {m['brier_score']:.4f}")
    print(f"Log Loss:              {m['log_loss']:.4f}")
    print(f"Expected Calib Error:  {results['calibration']['expected_calibration_error']:.4f}")

    print("\n--- Threshold Classification Metrics (at fixed 0.5) ---")
    print(f"Accuracy:              {m['accuracy_at_0_5']:.4f} ({m['accuracy_at_0_5']*100:.2f}%)")
    print(f"Precision (Recovered): {m['precision_at_0_5']:.4f}")
    print(f"Recall (Recovered):    {m['recall_at_0_5']:.4f}")
    print(f"F1 Score:              {m['f1_at_0_5']:.4f}")

    cm = results["confusion_matrix"]
    print("\n--- Confusion Matrix (Validation) ---")
    print(f"TN: {cm['true_negatives']} | FP: {cm['false_positives']}")
    print(f"FN: {cm['false_negatives']} | TP: {cm['true_positives']}")

    print("\n--- Reliability / Calibration Bins ---")
    for b in results["calibration"]["bins"]:
        print(f"Bin {b['bin_range']}: count={b['count']:4d} | mean_pred={b['mean_predicted_prob']:.3f} | actual={b['actual_recovery_rate']:.3f} | gap={b['absolute_gap']:.3f}")

    print("\n--- Top 8 Feature Coefficients / Importances ---")
    top_items = list(results["feature_importances"].items())[:8]
    for feat, imp in top_items:
        sign = "+" if imp > 0 else ""
        print(f"  {feat:35s}: {sign}{imp:.4f}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate RecoveryOS ML Model")
    parser.add_argument("--data", default=str(DEFAULT_TRAIN_DATA_PATH))
    parser.add_argument("--model", default=str(DEFAULT_MODEL_PATH))
    args = parser.parse_args()

    results = evaluate_model(data_path=args.data, model_path=args.model)
    print_evaluation_report(results)
