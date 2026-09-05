import React, { useState, useRef } from "react";
import {
  Play,
  AlertTriangle,
  Dice5,
  CheckCircle2,
  Sliders,
  BarChart3,
  Layers,
} from "lucide-react";
import type { BatchEvaluationResult } from "../types/api";
import { formatINR, formatPercent } from "../services/api";
import { useScrollReveal } from "../hooks/useScrollReveal";

interface BenchmarkLabProps {
  batchResult: BatchEvaluationResult | null;
  loading: boolean;
  error: string | null;
  onRunBatch: (n: number, seed: number) => void;
  lastN?: number;
  lastSeed?: number;
}

export const BenchmarkLab: React.FC<BenchmarkLabProps> = ({
  batchResult,
  loading,
  error,
  onRunBatch,
  lastN,
  lastSeed,
}) => {
  const [sampleSize, setSampleSize] = useState(lastN ?? 500);
  const [seed, setSeed] = useState(lastSeed ?? 777);

  // Sync inputs with last run parameters when returning from other tabs
  React.useEffect(() => {
    if (lastN !== undefined) setSampleSize(lastN);
    if (lastSeed !== undefined) setSeed(lastSeed);
  }, [lastN, lastSeed]);

  const pageRef = useRef<HTMLDivElement>(null);
  useScrollReveal(pageRef);

  const ros = batchResult?.recoveryos;
  const baseline = batchResult?.blind_retry_baseline;

  const improvementPct =
    ros && baseline && baseline.net_recovered_value > 0
      ? ((ros.net_recovered_value - baseline.net_recovered_value) /
          baseline.net_recovered_value) *
        100
      : null;

  const handleRandomizeSeed = () => {
    const newSeed = Math.floor(Math.random() * 9000) + 1000;
    setSeed(newSeed);
    onRunBatch(sampleSize, newSeed);
  };

  return (
    <div className="benchmark-lab-page" ref={pageRef}>
      {/* Research Lab Header Strip */}
      <div className="experiment-control-strip scroll-reveal">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "var(--radius-sm)",
              background: "var(--indigo-dim)",
              border: "1px solid var(--indigo-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--indigo)",
            }}
          >
            <Sliders size={16} />
          </div>
          <div>
            <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#fff" }}>
              Simulation Parameter Configuration
            </span>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Run counterfactual A/B evaluation against a non-adaptive Blind Retry baseline
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
            <span>N (Events):</span>
            <input
              type="number"
              className="form-input"
              style={{ width: "80px", padding: "0.35rem 0.5rem" }}
              value={sampleSize}
              onChange={(e) => setSampleSize(Number(e.target.value))}
              min={50}
              max={5000}
              title="Number of held-out simulated events"
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
            <span>Seed:</span>
            <input
              type="number"
              className="form-input"
              style={{ width: "80px", padding: "0.35rem 0.5rem" }}
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              title="PRNG Seed (same seed produces identical transactions)"
            />
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRandomizeSeed}
            disabled={loading}
            title="Pick a fresh random seed and evaluate new transactions"
          >
            <Dice5 size={15} className={loading ? "spinner" : ""} />
            <span>Random Seed</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onRunBatch(sampleSize, seed)}
            disabled={loading}
          >
            <Play size={14} className={loading ? "spinner" : ""} />
            <span>{loading ? "Simulating Batch..." : "Run Benchmark"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "1rem",
            background: "var(--rose-bg)",
            border: "1px solid var(--rose)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            color: "#fca5a5",
            marginBottom: "1.5rem",
          }}
        >
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="card loading-state">
          <div className="spinner" />
          <h3 style={{ color: "#fff", fontWeight: 600 }}>Executing Monte Carlo Benchmark (N={sampleSize}, Seed={seed})</h3>
          <p style={{ maxWidth: "450px" }}>
            Generating held-out payment events, profiling failure categories, evaluating S-Learner probabilities, and calculating Net Incremental Recovery (NIR)...
          </p>
        </div>
      )}

      {!loading && !batchResult && !error && (
        <div className="card empty-state">
          <p>Click "Run Benchmark" above to begin the comparative evaluation.</p>
        </div>
      )}

      {!loading && ros && baseline && (
        <div>
          {/* Top Metric Cards */}
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-label">Benchmark Batch Size</span>
              <span className="metric-value">{ros.total_transactions}</span>
              <span className="metric-sub">Held-out payment events</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Revenue at Risk</span>
              <span className="metric-value">{formatINR(ros.total_at_risk_revenue)}</span>
              <span className="metric-sub">Total failed volume tested</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Gross Recovered</span>
              <span className="metric-value emerald">{formatINR(ros.recovered_revenue)}</span>
              <span className="metric-sub">
                Recovery Rate: <strong>{formatPercent(ros.recovery_rate)}</strong>
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Net Recovered Value</span>
              <span className="metric-value emerald">{formatINR(ros.net_recovered_value)}</span>
              <span className="metric-sub">Gross Revenue minus Costs</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Intervention Cost</span>
              <span className="metric-value">{formatINR(ros.intervention_cost_total)}</span>
              <span className="metric-sub">API & operational costs</span>
            </div>
          </div>

          {/* Section C: A/B Comparative Breakdown Grid */}
          <div className="comparison-grid" style={{ marginBottom: "1.5rem" }}>
            {/* Net Value Advantage Hero Card */}
            <div className="advantage-card">
              <span className="advantage-badge">
                <CheckCircle2 size={14} />
                Net Value Advantage
              </span>
              <div className="advantage-value">
                {improvementPct !== null ? `+${improvementPct.toFixed(1)}%` : "N/A"}
              </div>
              <p className="advantage-desc">
                Second generated{" "}
                <strong>{formatINR(batchResult.net_recovered_value_improvement)}</strong> more
                net revenue than blindly retrying every failed transaction.
              </p>

              <div
                style={{
                  marginTop: "1.5rem",
                  borderTop: "1px solid var(--border-subtle)",
                  paddingTop: "1rem",
                  fontSize: "0.8125rem",
                  color: "var(--text-secondary)",
                }}
              >
                <div>
                  • Targeted Customer Interventions:{" "}
                  <strong className="cyan">{ros.customer_interventions}</strong>
                </div>
                <div style={{ marginTop: "0.35rem" }}>
                  • Policy Halted Hard Declines:{" "}
                  <strong className="rose">{ros.halted_cases}</strong>
                </div>
                <div style={{ marginTop: "0.35rem" }}>
                  • Baseline Blind Retries:{" "}
                  <strong>{baseline.total_transactions} (100%)</strong>
                </div>
              </div>
            </div>

            {/* Side-by-Side Table */}
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-header">
                <div>
                  <h3 className="card-title">
                    <BarChart3 size={16} className="indigo" />
                    Comparative A/B Performance Matrix
                  </h3>
                  <p className="card-subtitle">
                    Evaluation of identical payment failures under Blind Retry vs. Second
                  </p>
                </div>
                <span className="badge badge-muted">Seed #{lastSeed ?? seed}</span>
              </div>

              <div className="comparison-table-container">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Blind Retry Baseline</th>
                      <th>Second</th>
                      <th>Delta / Uplift</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Gross Revenue Recovered</td>
                      <td className="mono">{formatINR(baseline.recovered_revenue)}</td>
                      <td className="mono emerald">{formatINR(ros.recovered_revenue)}</td>
                      <td className="mono emerald" style={{ fontWeight: 600 }}>
                        +{formatINR(ros.recovered_revenue - baseline.recovered_revenue)}
                      </td>
                    </tr>
                    <tr>
                      <td>Recovery Rate</td>
                      <td className="mono">{formatPercent(baseline.recovery_rate)}</td>
                      <td className="mono emerald">{formatPercent(ros.recovery_rate)}</td>
                      <td className="mono emerald" style={{ fontWeight: 600 }}>
                        +{((ros.recovery_rate - baseline.recovery_rate) * 100).toFixed(1)}% pts
                      </td>
                    </tr>
                    <tr>
                      <td>Intervention Cost Incurred</td>
                      <td className="mono">{formatINR(baseline.intervention_cost_total)}</td>
                      <td className="mono">{formatINR(ros.intervention_cost_total)}</td>
                      <td className="mono text-secondary">
                        +{formatINR(ros.intervention_cost_total - baseline.intervention_cost_total)}
                      </td>
                    </tr>
                    <tr className="highlight">
                      <td style={{ fontWeight: 700, color: "#fff" }}>
                        Net Recovered Value (NIR)
                      </td>
                      <td className="mono" style={{ fontWeight: 600 }}>
                        {formatINR(baseline.net_recovered_value)}
                      </td>
                      <td className="mono emerald" style={{ fontWeight: 700, fontSize: "1rem" }}>
                        {formatINR(ros.net_recovered_value)}
                      </td>
                      <td className="mono emerald" style={{ fontWeight: 700 }}>
                        +{formatINR(batchResult.net_recovered_value_improvement)}
                      </td>
                    </tr>
                    <tr>
                      <td>Customer Outreach</td>
                      <td className="mono">0 (Customer Ignored)</td>
                      <td className="mono cyan">{ros.customer_interventions} (Targeted Outreach)</td>
                      <td className="mono cyan">Resolution links sent</td>
                    </tr>
                    <tr>
                      <td>Policy-Halted Fraud / Lost Cards</td>
                      <td className="mono">0 (Blindly Retried)</td>
                      <td className="mono rose">{ros.halted_cases} (Stopped Immediately)</td>
                      <td className="mono rose">Wasted fees averted</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Action Distribution Comparison Card */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <Layers size={16} className="cyan" />
                  Action Distribution Across {ros.total_transactions} Transactions
                </h3>
                <p className="card-subtitle">
                  Blind retry applies 100% SILENT_RETRY regardless of failure cause; Second adapts per failure mode
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "1rem" }}>
              {Object.entries(ros.action_distribution).map(([action, count]) => {
                const pct = (count / ros.total_transactions) * 100;
                return (
                  <div
                    key={action}
                    style={{
                      background: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      padding: "0.85rem 1rem",
                    }}
                  >
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
                      {action}
                    </span>
                    <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#fff", fontFamily: "var(--font-mono)", marginTop: "0.2rem" }}>
                      {count}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                      {pct.toFixed(1)}% of batch
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
