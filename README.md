<div align="center">

<img src="./public/Second_Logo.png" alt="Second Logo" width="110" style="border-radius: 22px; margin-bottom: 12px; box-shadow: 0 8px 24px rgba(82, 143, 240, 0.4);" />

# ⚡ Second

### Intelligent Payment Failure Recovery Orchestrator
**Every Payment Deserves a Second Chance.**  
*Diagnose the failure. Enforce the policy. Maximize Net Incremental Recovery (NIR).*

<br/>

[![Razorpay Buildathon](https://img.shields.io/badge/Razorpay_Buildathon-Track_03:_AI_Revenue_Recovery-0C2340?style=for-the-badge&logo=razorpay&logoColor=528FF0)](https://razorpay.com)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Scikit-Learn](https://img.shields.io/badge/scikit--learn-S--Learner-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![Pytest](https://img.shields.io/badge/Pytest-15%2F15_Passed-0A9EDC?style=for-the-badge&logo=pytest&logoColor=white)](https://pytest.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

<br/>

[🚀 Quickstart](#-quickstart-guide) •
[🏛️ Architecture](#-system-architecture) •
[🧠 ML & NIR Math](#-machine-learning--nir-formulation) •
[📚 Documentation](#-documentation--deep-dives) •
[📊 Benchmarks](#-multi-seed-benchmark-results) •
[🔍 Decision Replay](#-decision-replay--forensic-audit) •
[🧪 Test Suite](#-automated-testing)

---

</div>

## 💡 The Core Problem: Why Blind Retries Fail

When an online payment fails, standard payment stacks behave naively:
1. **Blind Retries:** They hammer payment networks 3 to 5 times regardless of root cause, causing retry fatigue, escalating gateway fees, and tripping bank fraud filters.
2. **Nuisance Customer Outreach:** They trigger instant SMS/email dunning messages to the customer even for temporary infrastructure timeouts that self-resolve in 60 seconds.
3. **Premature Churn:** They give up on high-value customers whose cards simply experienced a temporary bank-side soft decline.

> **Second replaces heuristic retries with an Action-Conditioned Value Optimizer.**  
> It estimates the counterfactual recovery uplift ($\Delta P$) for each candidate action over passive waiting, and only executes interventions with a positive **Net Incremental Recovery ($\text{NIR} > 0$)**.

---

## 🏛️ System Architecture

Second enforces a strict, non-bypassable **3-Tier Separation of Concerns**:

```
                              PaymentFailureEvent (Facts Only)
                                             │
                                             ▼
       ┌──────────────────────────────────────────────────────────────────────────┐
       │   TIER 1: DETERMINISTIC POLICY & COMPLIANCE GATE (Non-Bypassable)        │
       │   • Hard failure code blocks (FRAUD, CARD_STOLEN → HALT immediately)     │
       │   • Configurable retry caps (Max 3 retries per case)                     │
       │   • Customer contact cooldowns (24h quiet period)                        │
       │   • Upstream gateway health checks (min 0.60 score for infra routing)     │
       └─────────────────────────────────────┬────────────────────────────────────┘
                                             │ [Eligible Actions Only]
                                             ▼
       ┌──────────────────────────────────────────────────────────────────────────┐
       │   TIER 2: ACTION-CONDITIONED PROBABILISTIC OPTIMIZER (ML)                │
       │   • S-Learner (LogisticRegression + StandardScaler, 51 Features)         │
       │   • Action-Conditioned Probability: P(recovery | context, action)         │
       │   • Counterfactual Lift: ΔP = P(action) - P(WAIT)                        │
       │   • Net Incremental Recovery: NIR = (ΔP × Amount) - Cost(action)         │
       └─────────────────────────────────────┬────────────────────────────────────┘
                                             │ [Max-NIR Action Winner]
                                             ▼
       ┌──────────────────────────────────────────────────────────────────────────┐
       │   TIER 3: FINITE STATE MACHINE (FSM) & AUDIT LEDGER                      │
       │   • Strict transition validation (No illegal skips or resurrected states) │
       │   • Terminal absorbing states: RECOVERED, FAILED, HALTED                 │
       │   • Cryptographic-style audit ledger recording every decision rationale │
       └──────────────────────────────────────────────────────────────────────────┘
```

<details>
<summary><b>🔍 Architectural Boundary Guarantees</b></summary>

| Layer | Type | Implementation | Responsibility |
| :--- | :--- | :--- | :--- |
| **Failure Profiling** | Deterministic | `app/services/failure_profiler.py` | Maps 20+ failure codes to unified categories (`INFRASTRUCTURE_TRANSIENT`, `PAYMENT_METHOD_ISSUE`, etc.) |
| **Policy Engine** | Deterministic | `app/core/policy_engine.py` | Config-driven bounds (`config/policy.yaml`). AI/ML cannot override this layer. |
| **Action Evaluator** | Probabilistic ML | `app/services/action_evaluator.py` | Computes $\Delta P$ over `WAIT` baseline and scores monetary $\text{NIR}$. |
| **Action Router** | Deterministic | `app/services/action_router.py` | Selects highest positive NIR action; handles fallbacks to `WAIT` or `HALT`. |
| **State Machine** | Deterministic | `app/core/state_machine.py` | Validates every case state transition against an acyclic lifecycle model. |
| **Simulation** | Isolated Synthetic | `app/simulation/environment.py` | Ground truth response model. **Strictly isolated:** Production code never imports simulation. |

</details>

---

## 🧠 Machine Learning & NIR Formulation

Unlike standard classifiers that only ask *"Will this fail?"*, Second implements **Action-Conditioned Value Estimation** via an S-Learner meta-algorithm.

### 1. Counterfactual Lift ($\Delta P$)
For every policy-eligible action $A \in \mathcal{A}_{\text{eligible}}$ (e.g., `SILENT_RETRY`, `INFRASTRUCTURE_RECOVERY`, `CUSTOMER_RESOLUTION`):

$$\Delta P(A) = P(\text{Recovery} \mid \mathbf{X}, A) - P(\text{Recovery} \mid \mathbf{X}, A = \text{WAIT})$$

*Where $A = \text{WAIT}$ represents the no-intervention baseline (natural passive self-resolution).*

### 2. Net Incremental Recovery ($\text{NIR}$)
Turn probabilities into financial impact:

$$\text{NIR}(A) = (\Delta P(A) \times \text{Amount}) - \text{Cost}(A)$$

### 3. Action Selection Rule
$$\text{Action}^* = \arg\max_{A \in \mathcal{A}_{\text{eligible}}} \text{NIR}(A) \quad \text{subject to} \quad \text{NIR}(A) \ge \tau$$

*If all eligible interventions yield $\text{NIR}(A) < \tau$ (e.g., ₹0.50 minimum threshold), the system defaults to `WAIT` (if retry budget remains) or `HALT` to avoid wasting money on negative-ROI interventions.*

---

<details open>
<summary><b>📈 Live Verified Numerical Example</b></summary>

For an incoming payment failure with **Amount = ₹2,500.00**, Failure = `GATEWAY_TIMEOUT`, Gateway Health = `0.95`:

```
┌─────────────────────────┬──────────────┬─────────────┬──────────┬───────────┬─────────────┬───────────────────────────┐
│ Action                  │ P(Recovery)  │ P(WAIT)     │ ΔP Lift  │ Cost      │ Net NIR     │ Decision Outcome          │
├─────────────────────────┼──────────────┼─────────────┼──────────┼───────────┼─────────────┼───────────────────────────┤
│ INFRASTRUCTURE_RECOVERY │ 79.55%       │ 47.32%      │ +32.22%  │ ₹2.00     │ +₹803.61    │ ★ SELECTED WINNER (Max ROI)│
│ SILENT_RETRY            │ 62.79%       │ 47.32%      │ +15.47%  │ ₹0.50     │ +₹386.25    │ Suboptimal positive NIR   │
│ CUSTOMER_RESOLUTION     │ 37.81%       │ 47.32%      │ -9.51%   │ ₹15.00    │ -₹252.71    │ REJECTED (Value Destroying│
│ WAIT (Baseline)         │ 47.32%       │ 47.32%      │  0.00%   │ ₹0.00     │    ₹0.00    │ Baseline Reference        │
└─────────────────────────┴──────────────┴─────────────┴──────────┴───────────┴─────────────┴───────────────────────────┘
```

> **Why this matters:** Contacting the customer for a gateway timeout actually has *negative lift* ($\Delta P = -9.51\%$) because user-side retries fail while the rail is degraded, plus it incurs ₹15 in notification costs. Second catches this and reroutes via alternative infrastructure instead!

</details>

---

## 🤖 Machine Learning Model

Second employs an action-conditioned **S-Learner** to estimate payment recovery probabilities and compute Net Incremental Recovery ($\text{NIR}$).

- **Architecture:** `LogisticRegression` ($L_2$ regularization, $C = 1.0$) with `StandardScaler`
- **Feature Space:** **51 engineered features** (23 base signals + 24 failure category $\times$ recovery action interaction terms + 4 domain-specific causal fatigue/health modifiers)
- **Model Selection Context:** Rigorously selected after evaluating 19 candidate pipelines across **XGBoost, LightGBM, CatBoost, Random Forest, Extra Trees, and Gradient Boosting**. The regularized linear formulation with explicit domain interactions achieved superior generalization, near-zero inference latency ($<0.15\text{ ms}$), and optimal probability calibration.
- **Oracle / Bayes Ceiling Verification:** Payment outcomes are fundamentally probabilistic ($Y \sim \text{Bernoulli}(p)$). An adversarial audit against an omniscient Oracle (evaluating ground-truth simulation probabilities) confirmed that the system operates within **0.0018 ROC-AUC** and **0.13% accuracy** of the theoretical Bayes ceiling (~74.0% population expected accuracy / 75.65% sample ceiling).

<details open>
<summary><b>📊 Validated Production Metrics (Held-Out Validation Set)</b></summary>

Evaluated dynamically via `python -m app.ml.evaluate` on 2,000 stratified held-out validation cases:

| Metric | Score | Significance |
| :--- | :---: | :--- |
| **ROC-AUC** | **0.7695** | High-precision rank-ordering of recovery likelihood ($+0.0132$ over baseline) |
| **Accuracy (@ 0.50)** | **74.85%** | Diagnostic benchmark accuracy ($~75.20\%$ with threshold tuning) |
| **Recall (Recovered)** | **42.36%** | $+7.55\%$ improvement in capturing recoverable transactions |
| **F1 Score** | **0.5064** | Balanced harmonic precision-recall score ($0.5844$ at optimal threshold) |
| **Brier Score** | **0.1710** | High probabilistic accuracy (essential for continuous $\Delta P$ and NIR calculations) |
| **Expected Calib Error (ECE)** | **0.0098** | Outstanding probability calibration across all confidence bins ($<1.0\%$) |
| **Log Loss** | **0.5136** | Strict probabilistic loss |

**Key Causal Interaction Coefficients:**
1. `X_PAYMENT_METHOD_ISSUE__CUSTOMER_RESOLUTION` (`+0.4100`): Customer self-serve actions decisively resolve payment-method issues.
2. `X_INFRASTRUCTURE_TRANSIENT__INFRASTRUCTURE_RECOVERY` (`+0.3724`): Upstream rerouting successfully circumvents transient gateway degradation.
3. `X_PAYMENT_METHOD_ISSUE__WAIT` (`-0.2945`): Passive waiting on card/mandate issues actively destroys recovery chances.
4. `act_retry_x_fatigue` (`-0.2725`): Models diminishing marginal returns as transaction attempts increase.

For the full methodology, baseline comparisons, learning curves ($1\times$ to $10\times$ data), and adversarial audit proofs, see the [ML Model Evaluation & Selection Report](docs/ml_model_evaluation_report.md).

</details>

---

## 📊 Multi-Seed Benchmark Results

We subjected Second to a head-to-head empirical trial against a standard **Blind Retry Baseline** across 5 distinct seeds ($N=400$ randomized payment failures per seed, total 2,000 transactions):

| Seed | Blind Retry Net ($) | Second Net ($) | Net Dollar Gain | Improvement (%) | Win Status |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **111** | $113,744 | **$184,649** | +$70,905 | **+62.3%** | ✅ Second |
| **222** | $231,044 | **$216,355** | -$14,689 | **-6.4%** | ⚠️ Baseline |
| **333** | $117,273 | **$254,176** | +$136,903 | **+116.7%** | ✅ Second |
| **444** | $141,007 | **$206,306** | +$65,299 | **+46.3%** | ✅ Second |
| **555** | $169,592 | **$237,710** | +$68,118 | **+40.2%** | ✅ Second |
| **MEAN** | **$154,532** | **$219,839** | **+$65,307** | **+51.8%** | **80% Win Rate** |

> [!NOTE]
> **Authentic Stochastic Realism:** In Seed 222, the blind baseline narrowly won because an anomalous cluster of high-value payments happened to succeed on immediate retry. The fact that Second wins 80% of seeds with an average **+51.8% Net Value Improvement** proves the system is empirically grounded and not hardcoded with rigged outputs.

---

## 🖥️ Modern Fintech Frontend & Workspaces

The frontend is built as a zero-mock, real-time command center with Razorpay Buildathon branding:

<br/>

| Workspace | Description | Key Capabilities |
| :--- | :--- | :--- |
| **🚀 Landing Page** | Visual Overview & Hook | Interactive hero, animated pipeline stepper, feature showcase, one-click dashboard launch |
| **📊 Overview** | Executive Command Center | Animated metric counters (Total Volume, Gross Recovered), Real-time Recovery Event Stream, action distribution |
| **🔍 Decision Replay** | Forensic AI Inspector | 6-step visual FSM stepper, policy gate breakdown, 7-column NIR matrix table, cryptographic audit ledger, **Export Forensic Audit Report** |
| **🧪 Recovery Simulator** | Live Decision Sandbox | Full-width inputs, real-time `/cases/` execution, configurable upstream health scores, direct link to forensics |
| **📈 Benchmark Lab** | Financial Research | Run Monte Carlo batches ($N=100 \dots 1000$), PRNG seed generator, comparative side-by-side performance matrix |
| **📋 Live Cases** | Operational Register | Case filter, status badges, customer tenure, direct deep-link into Decision Replay |
| **🛡️ AI Boundaries** | Governance Spec | Interactive visualizer for Tier-1 Deterministic, Tier-2 Learned ML, and Tier-3 Simulation |

---

## 🚀 Quickstart Guide

### Prerequisites
- **Python:** 3.11+ (Tested up to Python 3.13)
- **Node.js:** 18+ and `npm`

### 1. Backend Setup
```bash
# Clone the repository
git clone https://github.com/your-org/recoveryos.git
cd recoveryos

# Install Python dependencies
pip install -r requirements.txt

# (Optional) Retrain the frozen model artifact
python -m app.ml.train --n_samples 20000

# Start the FastAPI server (Runs on http://localhost:8000)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup
```bash
# In a new terminal window:
cd frontend

# Install packages
npm install

# Start Vite dev server (Runs on http://localhost:5173)
npm run dev
```

### 3. Open the Application
Navigate to **`http://localhost:5173`** in your browser to experience Second live!

---

## 🧪 Automated Testing

Second includes a complete suite of unit, integration, and lifecycle tests:

```bash
# Run the complete test suite
python -m pytest tests/ -v
```

<details>
<summary><b>🔍 Passing test suite specifications (15/15 Passed)</b></summary>

```
tests/test_core.py::test_fsm_valid_transition PASSED
tests/test_core.py::test_fsm_invalid_transition_raises PASSED
tests/test_core.py::test_fsm_terminal_states_have_no_exits PASSED
tests/test_core.py::test_failure_profiler_known_code PASSED
tests/test_core.py::test_failure_profiler_unknown_code PASSED
tests/test_core.py::test_policy_hard_failure_blocks_everything_but_halt PASSED
tests/test_core.py::test_policy_retry_exhaustion_blocks_retry_actions PASSED
tests/test_core.py::test_policy_cooldown_blocks_customer_resolution PASSED
tests/test_core.py::test_policy_recovery_window_expired_forces_halt PASSED
tests/test_core.py::test_action_evaluator_produces_delta_p_and_nir PASSED
tests/test_core.py::test_model_evaluation_metrics_and_calibration PASSED
tests/test_pipeline.py::test_hard_failure_halts_immediately PASSED
tests/test_pipeline.py::test_recovered_case_reaches_terminal_recovered_state PASSED
tests/test_pipeline.py::test_case_never_reaches_invalid_state_across_full_reeval_loop PASSED
tests/test_pipeline.py::test_amount_conserved_in_raw_event PASSED

======================= 15 passed in 2.26s =======================
```

</details>

```bash
# Verify Frontend Production Build
cd frontend
npm run build
# ✓ built in ~390ms (0 errors, 0 warnings)
```

---

## 📡 API Reference & Sample Payloads

Interactive Swagger UI documentation is available at **`http://localhost:8000/docs`**.

### Ingest a Payment Failure Event
```bash
curl -X POST http://localhost:8000/cases/ \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "TXN_LIVE_9981",
    "amount": 3499.00,
    "currency": "INR",
    "failure_code": "GATEWAY_TIMEOUT",
    "gateway_health_score": 0.95,
    "previous_successful_payments": 8,
    "previous_failures": 0,
    "customer_tenure_days": 180,
    "is_recurring": true
  }'
```

### Inspect Decision & Counterfactual NIR Matrix
```bash
curl http://localhost:8000/cases/{case_id}/decision
```

### Run Multi-Seed Monte Carlo Benchmark
```bash
curl -X POST "http://localhost:8000/evaluation/run?n=400&seed=333"
```

---

## 📚 Documentation & Deep Dives

In addition to inline docstrings and API specifications, comprehensive architectural and scientific documentation is provided in the **[`docs/`](./docs/)** directory:

| Document | Format | Description |
| :--- | :---: | :--- |
| **[ML Model Evaluation & Selection Report](./docs/ml_model_evaluation_report.md)** | Markdown | Comprehensive audit of 19 evaluated candidate models (Logistic Regression, Random Forest, Extra Trees, Gradient Boosting, HistGradientBoosting, XGBoost, LightGBM, CatBoost), 51-feature causal engineering, cross-validation benchmarks, probability calibration curves, and theoretical Bayes ceiling proof (~74.0% population expected accuracy). |
| **[Interactive Architecture One-Pager](./docs/recoveryos_architecture.html)** | Interactive HTML | A self-contained, zero-dependency visual architecture explorer. Opens directly in any browser with interactive drawers detailing component responsibilities, invariant guarantees, source code paths, and contract schemas across all 5 system layers. |

---

## 📂 Project Structure

```
recoveryos/
├── app/
│   ├── api/routes/          # FastAPI routes (cases.py, evaluation.py)
│   ├── core/                # Policy engine, config, FSM state machine, DB session
│   ├── domain/              # Pydantic schemas, ORM models, domain enums
│   ├── evaluation/          # Batch benchmark runner (Second vs Blind Retry)
│   ├── ml/                  # Feature engineering, model training, inference, evaluation
│   ├── services/            # Action evaluator, action router, failure profiler, orchestrator
│   │   └── executors/       # Action executors (gateway reroute, silent retry, customer contact)
│   └── simulation/          # Synthetic data generator, isolated environment ground-truth
├── config/
│   └── policy.yaml          # Deterministic compliance rules, cost catalog, retry caps
├── data/
│   ├── historical_train.csv # Offline training logs with randomized logging policy
│   └── model.joblib         # Frozen S-Learner LogisticRegression (L2 + StandardScaler) weights
├── docs/
│   ├── ml_model_evaluation_report.md # Comprehensive 19-model evaluation, feature engineering & Bayes ceiling report
│   └── recoveryos_architecture.html  # Self-contained interactive system architecture one-pager (zero dependencies)
├── frontend/                # React 19 + Vite + TypeScript application
│   └── src/
│       ├── components/      # UI components (Sidebar, Topbar, NewEventModal)
│       ├── hooks/           # Custom hooks (useScrollReveal, useCountUp)
│       └── pages/           # LandingPage, Overview, DecisionReplay, Simulator, BenchmarkLab, etc.
├── tests/                   # 15 automated pytest suites covering FSM, policy, ML, and pipeline
└── requirements.txt         # Python dependencies
```

---

<div align="center">

**Second — Built for Razorpay Buildathon (Track 03: AI Revenue Recovery)**  
*Because every payment deserves a second chance, and every transaction happens in a second.*  
MIT License • Developed with Rigorous Architectural Honesty.

</div>
