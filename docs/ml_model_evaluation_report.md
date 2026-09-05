# ML Model Evaluation & Selection Report

**Project:** Second — AI Revenue Recovery  
**Document Version:** 1.0 (Final)  
**Status:** Complete & Validated  
**Audience:** Buildathon Reviewers, Technical Evaluators, and Engineers  

---

## 1. Overview

Second is an intelligent payment failure recovery orchestration engine designed to recover lost revenue from failed online transactions (e.g., Razorpay, UPI, cards, net banking). 

Rather than executing naive, brute-force payment retries—which degrade merchant gateway health scores, trigger customer annoyance, and incur unnecessary gateway fee penalties—Second formulates recovery as an **action-conditioned decision problem**. For every payment failure event, the system evaluates candidate recovery actions:
- `INFRASTRUCTURE_RECOVERY` (smart re-routing through healthy payment channels)
- `SILENT_RETRY` (optimal delayed transaction retry)
- `CUSTOMER_RESOLUTION` (targeted customer self-serve intervention)
- `WAIT` (no-intervention baseline)
- `HALT` (immediate cessation for unrecoverable/fraud cases)

The machine learning component acts as an **S-Learner** predicting the probability of recovery conditioned on the failure context and proposed action:
$$\hat{p} = P(\text{Recovery} \mid X, \text{Action})$$

Because these predictions directly feed downstream revenue optimization logic—specifically calculating the **Net Incremental Recovery (NIR)** value:
$$\text{NIR} = (\Delta P \cdot \text{Amount}) - \text{Intervention Cost}, \quad \text{where } \Delta P = P(\text{Action}) - P(\text{WAIT})$$
the model selection criteria required not only strong discrimination (ROC-AUC, F1, Accuracy) but also **strict probability calibration** (low Brier score and Expected Calibration Error).

---

## 2. Original Baseline

The initial production prototype utilized a tree-based ensemble trained on 23 raw base features:
- **Architecture:** `GradientBoostingClassifier` (150 trees, max depth = 3, learning rate = 0.05, subsample = 0.8)
- **Feature Set:** 23 un-interacted features (10 continuous/count features + 6 failure category one-hot dummies + 3 gateway one-hot dummies + 4 action one-hot dummies)
- **Baseline Held-out Performance:**
  - **ROC-AUC:** `0.7563`
  - **Accuracy (@ 0.50):** `73.65%`
  - **Recall (@ 0.50):** `34.81%`
  - **F1 Score (@ 0.50):** `0.4458`
  - **Brier Score:** `0.1744`
  - **Log Loss:** `0.5283`

While functional, the baseline model suffered from low recall on positive recoveries ($34.81\%$), sluggish inference throughput, and relied on a tree structure to discover complex cross-feature interactions without explicit domain representation.

---

## 3. First Model Experimentation Round

To identify whether architectural changes could boost recovery discrimination, an initial benchmark was conducted using 5-fold stratified cross-validation across diverse model families:
- **Logistic Regression** (Linear baseline with L2 regularization)
- **Random Forest** (Non-parametric bagging)
- **Gradient Boosting** (`sklearn` boosting baseline)
- **HistGradientBoosting** (Histogram-binned tree boosting)
- **XGBoost** (Extreme Gradient Boosting)

### Key Discovery:
In the presence of explicit interaction features, **regularized linear models (Logistic Regression) systematically matched or outperformed deep tree ensembles**. Tree-based models required substantial tree depth to approximate the bilinear cross-products between categorical failure profiles and proposed recovery treatments. In contrast, an $L_2$-regularized linear model with explicit interaction terms directly estimates the conditional treatment effects with lower parameter variance and superior probability calibration.

---

## 4. Feature Engineering

The feature space was expanded from 23 raw variables to a curated **51-feature representation** incorporating explicit causal and domain interactions:

### 1. Base Contextual Features (23 features)
- **Financial & Temporal:** `amount_log`, `is_recurring`, `hour_of_day_sin`, `hour_of_day_cos`, `customer_tenure_days_log`
- **Gateway & Reliability:** `gateway_health_score`, one-hot indicators for Gateways A, B, C
- **Customer Behavioral History:** `previous_attempts`, `previous_failures`, `previous_successful_payments`, `success_rate_history`
- **Taxonomy & Treatments:** 6 Failure Category one-hot dummies, 4 Candidate Action one-hot dummies

### 2. Category × Action Interactions (24 features)
- Cross-product indicators: $\phi_{c, a} = \text{Indicator}(\text{FailureCategory} = c) \times \text{Indicator}(\text{Action} = a)$
- *Domain Rationale:* Represents the specific affinity between a failure root cause and a recovery treatment (e.g., customer resolution actions resolve payment method issues, while infra re-routing resolves gateway timeouts).

### 3. Domain-Specific Causal Modifiers (4 features)
- `act_infra_x_health`: $\text{Action}_{\text{INFRA}} \times (\text{Gateway Health} - 0.5)$ — captures gateway sensitivity during infrastructure routing.
- `act_retry_x_health`: $\text{Action}_{\text{RETRY}} \times (\text{Gateway Health} - 0.5)$ — captures the dependency of silent retries on gateway stability.
- `act_retry_x_fatigue`: $(\text{Action}_{\text{INFRA}} + \text{Action}_{\text{RETRY}}) \times \text{Previous Attempts}$ — models diminishing recovery returns as prior retry attempts increase.
- `cust_res_x_hist`: $\text{Action}_{\text{CUSTOMER}} \times (\text{Historical Success Rate} - 0.5)$ — accounts for higher customer responsiveness among historically loyal users.

This 51-feature representation provided the exact information geometry required for linear models to capture recovery dynamics cleanly.

---

## 5. Hyperparameter and Regularization Evaluation

We systematically evaluated regularization penalties, regularizer strengths ($C$), and feature weighting schemes for Logistic Regression:
- **Regularization Type:** $L_1$ (Lasso / feature selection) vs. $L_2$ (Ridge / shrinkage).
- **Inverse Regularization Strength ($C$):** Swept across $[0.01, 0.1, 0.5, 1.0, 5.0, 10.0]$.
- **Class Weighting:** `balanced` vs. uniform weights.

### Findings:
- Both $L_1$ and $L_2$ produced virtually identical cross-validation ROC-AUC ($0.7718$ vs $0.7714$, $\Delta < 0.0004$, statistically insignificant).
- $L_2$ regularization with $C = 1.0$ produced the smoothest probability estimates and lowest Brier score ($0.1710$).
- `StandardScaler` was essential to prevent continuous features with larger numerical magnitudes (`amount_log`, `previous_attempts`) from being regularized disproportionately relative to binary interaction dummies.

---

## 6. Advanced Architecture Search

To ensure no competitive architecture was overlooked, a broader benchmark was conducted including modern gradient boosted trees and nonlinear expansions:
- **Logistic Regression Variants** (L1, L2, ElasticNet)
- **Random Forest Classifier**
- **Extra Trees Classifier** (Extremely randomized trees)
- **Histogram Gradient Boosting** (`HistGradientBoostingClassifier`)
- **XGBoost** (tuned depth and subsampling)
- **LightGBM** (leaf-wise gradient boosting)
- **CatBoost** (symmetric oblivious decision trees)
- **Nonlinear V2 Feature Expansion** (80 features incorporating quadratic gateway health, polynomial tenure, and logarithmic retry ratios)
- **Ensemble Models** (Soft voting and weighted blending of top-performing models)

### Results:
| Architecture / Pipeline | Feature Set | CV ROC-AUC | Val ROC-AUC | Val Accuracy | Val Brier |
|---|---|---|---|---|---|
| **Logistic Regression ($L_2, C=1.0$) + Scaler** | **51 features** | **0.7714** | **0.7695** | **74.85%** | **0.1710** |
| Logistic Regression ($L_1, C=0.1$) + Scaler | 80 features (V2) | 0.7718 | 0.7694 | 74.80% | 0.1711 |
| CatBoost Classifier | 51 features | 0.7691 | 0.7672 | 75.10% | 0.1715 |
| LightGBM Classifier | 51 features | 0.7684 | 0.7668 | 74.65% | 0.1718 |
| HistGradientBoosting | 51 features | 0.7675 | 0.7655 | 74.70% | 0.1720 |
| XGBoost Classifier | 51 features | 0.7579 | 0.7592 | 74.15% | 0.1740 |
| Soft-Voting Ensemble (LR + CatBoost + LightGBM) | 51 features | 0.7702 | 0.7685 | 74.90% | 0.1712 |

**Conclusion:** Neither advanced gradient boosted decision trees (XGBoost, LightGBM, CatBoost) nor multi-model ensembles statistically outperformed the simpler, faster, and highly calibrated regularized Logistic Regression pipeline.

---

## 7. Performance Ceiling Analysis

An important analytical question arose during experimentation: *Why do all competitive models plateau in the ~75% accuracy and ~0.77 ROC-AUC range?*

### The Nature of Aleatoric Uncertainty
In real payment ecosystems—as well as the simulation environment—individual transactions are stochastic:
$$Y \sim \text{Bernoulli}(p^*(X))$$

Even when an observer possesses **omniscient knowledge** of the true generative probability $p^*(X)$, individual binary outcomes remain probabilistic coin flips. This introduces **irreducible aleatoric uncertainty (Bayes error rate)**:
$$R^* = \mathbb{E}_X [\min(p^*(X), 1 - p^*(X))]$$

### The Omniscient Oracle Benchmark
We constructed an **Oracle model** that evaluates the exact ground-truth mathematical simulation function. Under 0-1 loss, predicting $\hat{Y} = \mathbb{I}(p^*(X) \ge 0.5)$ is mathematically the optimal Bayes decision rule.

We evaluated the Oracle across both the held-out validation split and a large-scale asymptotic population ($N = 100,000$ synthetic transactions):

| Metric | Asymptotic Population ($N = 100,000$) | Held-Out Validation Split ($N = 1,000$) |
|---|---|---|
| Positive Class Prevalence | $30.84\%$ | $30.60\%$ |
| Probability Range | $[0.0050, 0.7725]$ | $[0.0050, 0.7700]$ |
| **Theoretical Bayes Expected Accuracy** | **73.94%** | **74.47%** |
| **Empirical Oracle Accuracy @ 0.50** | **74.02%** | **75.65%** |
| **Empirical Oracle Best Accuracy** | **74.02%** (threshold = 0.500) | **75.65%** (threshold = 0.500) |
| **Oracle Best F1 Score** | **0.5932** (threshold = 0.300) | **0.5898** (threshold = 0.370) |
| **Oracle ROC-AUC** | **0.7657** | **0.7713** |
| **Oracle Brier Score** | **0.1736** | **0.1704** |

### Critical Nuance: Sample Ceiling vs. Population Ceiling
The empirical Oracle accuracy on the single held-out validation split reached **75.65%**, which represents a favorable draw on the upper tail of the test-set sampling distribution ($+1.17\sigma$, where sampling standard deviation across 1,000-sample sets is $\pm 1.46\%$). The true asymptotic expected Bayes ceiling of the environment is **~74.0% expected accuracy** and **~0.766 ROC-AUC**.

---

## 8. Adversarial Audit

Before freezing the production model, a final adversarial "red-team" audit was conducted to aggressively challenge the conclusion that performance was near the ceiling:

1. **Observability Verification:** Every raw schema field (`PaymentFailureEvent`, database records, inference requests) was audited. No predictive or causal features were omitted.
2. **Data Sufficiency & Learning Curves:** The model was trained on progressively larger datasets ($1\times = 4,000$, $2\times = 8,000$, $5\times = 20,000$, and $10\times = 40,000$ samples) and evaluated on the same untouched validation set:
   - **Val ROC-AUC:** $0.7695 \rightarrow 0.7676 \rightarrow 0.7704 \rightarrow 0.7686$ ($\Delta = -0.0009$, completely flat).
   - **Val Accuracy:** $74.85\% \rightarrow 75.15\% \rightarrow 75.60\% \rightarrow 75.55\%$ ($\Delta = +0.70\%$, converging directly to the sample Oracle bound).
   - *Audit Conclusion:* The learning curve is asymptotically flat. The system is **Bayes-limited**, not data-limited.
3. **Exact Mathematical Simulator Basis:** We constructed the exact 27-variable basis corresponding to the simulation formulas. The resulting models (Ridge and Logistic Regression) achieved $0.7707$ and $0.7696$ ROC-AUC, matching the 51-feature Reference model ($0.7695$).
4. **Multi-Seed Generalization:** Evaluated across 10 independent test sets ($N = 1,000$ each, seeds 5000–5009):
   - **Oracle Ceiling:** $\text{ROC-AUC} = 0.7648 \pm 0.0177$, $\text{Accuracy} = 73.40\% \pm 1.50\%$
   - **Reference Model:** $\text{ROC-AUC} = 0.7630 \pm 0.0178$, $\text{Accuracy} = 73.27\% \pm 1.46\%$
   - **Paired $t$-test:** $t = -0.598, \; p = 0.5643$ ($p > 0.05$, difference is statistically indistinguishable).
   - **Gap to Omniscient Oracle:** **$0.0018$ ROC-AUC** and **$0.13\%$ Accuracy**.

---

## 9. Final Model Selection

### Production Configuration:
- **Algorithm:** Logistic Regression ($L_2$ penalty, $C = 1.0$)
- **Preprocessing:** `StandardScaler` (zero mean, unit variance)
- **Pipeline:** `sklearn.pipeline.Pipeline([("scaler", StandardScaler()), ("clf", LogisticRegression(C=1.0, max_iter=1000, random_state=42))])`
- **Features:** 51 validated engineered interaction features

### Performance Comparison:
| Metric | Original Baseline | Final Production Model | Net Improvement |
|---|---|---|---|
| **ROC-AUC** | 0.7563 | **0.7695** | **+0.0132** |
| **Accuracy (@ 0.50)** | 73.65% | **74.85%** | **+1.20%** |
| **Best Threshold Accuracy** | ~73.90% | **~75.20%** | **+1.30%** |
| **Recall (Recovered)** | 34.81% | **42.36%** | **+7.55%** |
| **F1 Score** | 0.4458 | **0.5064** | **+0.0606** |
| **Brier Score** | 0.1744 | **0.1710** | **-0.0034 (Improved)** |
| **Inference Latency** | ~3.5 ms | **< 0.15 ms** | **> 20x Faster** |

---

## 10. Final Conclusion

The final production ML model was established through an exhaustive, scientifically rigorous process:
1. Multi-architecture comparison across linear, bagging, and boosting paradigms.
2. Domain-informed causal interaction engineering.
3. Strict cross-validation and probability calibration analysis.
4. Independent Oracle ceiling verification and learning curve audits up to $10\times$ data.
5. Multi-seed statistical significance testing.

The selected **Logistic Regression ($L_2, C=1.0$) + StandardScaler pipeline with 51 engineered features** delivers the optimal balance of predictive discrimination, robust probability calibration, ultra-low latency, and production maintainability—operating within $0.0018$ ROC-AUC of the theoretical Bayes ceiling of the environment.
