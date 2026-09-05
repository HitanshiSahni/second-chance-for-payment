import React, { useState } from "react";
import {
  Play,
  TrendingUp,
  AlertTriangle,
  Dice5,
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import type { BatchEvaluationResult, CaseListItem } from "../types/api";
import { formatINR, formatPercent } from "../services/api";

interface BatchOverviewProps {
  batchResult: BatchEvaluationResult | null;
  loading: boolean;
  error: string | null;
  onRunBatch: (n: number, seed: number) => void;
  cases: CaseListItem[];
}

export const BatchOverview: React.FC<BatchOverviewProps> = ({
  batchResult,
  loading,
  error,
  onRunBatch,
  cases,
}) => {
  const [activeTab, setActiveTab] = useState<"benchmark" | "live">("benchmark");
  const [sampleSize, setSampleSize] = useState(500);
  const [seed, setSeed] = useState(777);

  const ros = batchResult?.recoveryos;
  const baseline = batchResult?.blind_retry_baseline;

  // Mathematically calculated from actual backend returned numbers
  const improvementPct =
    ros && baseline && baseline.net_recovered_value > 0
      ? ((ros.net_recovered_value - baseline.net_recovered_value) /
          baseline.net_recovered_value) *
        100
      : null;

  // Live Database Pipeline Stats
  const liveTotalCount = cases.length;
  const liveRevenueAtRisk = cases.reduce((acc, c) => acc + c.amount, 0);
  const liveRecoveredAmount = cases
    .filter((c) => c.is_recovered)
    .reduce((acc, c) => acc + (c.recovered_amount || c.amount), 0);
  const liveRecoveredCount = cases.filter((c) => c.is_recovered).length;
  const liveRecoveryRate = liveTotalCount > 0 ? liveRecoveredCount / liveTotalCount : 0;
  const liveReevaluateCount = cases.filter((c) => c.state === "RE_EVALUATE").length;
  const liveHaltedCount = cases.filter(
    (c) => c.state === "HALTED" || c.state === "UNRECOVERABLE"
  ).length;

  const handleRandomizeSeed = () => {
    const newSeed = Math.floor(Math.random() * 9000) + 1000;
    setSeed(newSeed);
    onRunBatch(sampleSize, newSeed);
  };

  return (
    <div className="card">
      <div className="card-header" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <h2 className="card-title">
              <TrendingUp size={18} className="emerald" />
              Recovery Performance Overview
            </h2>

            {/* View Mode Switcher */}
            <div
              style={{
                display: "inline-flex",
                background: "rgba(255,255,255,0.06)",
                borderRadius: "var(--radius-sm)",
                padding: "2px",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab("benchmark")}
                style={{
                  background: activeTab === "benchmark" ? "var(--primary-gradient)" : "transparent",
                  color: activeTab === "benchmark" ? "#fff" : "var(--text-secondary)",
                  border: "none",
                  padding: "0.25rem 0.65rem",
                  borderRadius: "calc(var(--radius-sm) - 2px)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  transition: "all 0.15s ease",
                }}
              >
                <BarChart3 size={13} />
                Held-Out Benchmark ({sampleSize} Events)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("live")}
                style={{
                  background: activeTab === "live" ? "var(--primary-gradient)" : "transparent",
                  color: activeTab === "live" ? "#fff" : "var(--text-secondary)",
                  border: "none",
                  padding: "0.25rem 0.65rem",
                  borderRadius: "calc(var(--radius-sm) - 2px)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  transition: "all 0.15s ease",
                }}
              >
                <Activity size={13} />
                Live Ingested Cases ({liveTotalCount})
              </button>
            </div>
          </div>

          <p className="card-subtitle">
            {activeTab === "benchmark"
              ? "Empirical Monte Carlo benchmark on held-out synthetic payments: RecoveryOS vs Blind Retry baseline."
              : "Live aggregate metrics for cases ingested into the operational SQLite database."}
          </p>
        </div>

        {activeTab === "benchmark" && (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              <span>N:</span>
              <input
                type="number"
                className="form-input"
                style={{ width: "75px", padding: "0.3rem 0.5rem" }}
                value={sampleSize}
                onChange={(e) => setSampleSize(Number(e.target.value))}
                min={50}
                max={5000}
                title="Number of held-out simulated events to evaluate"
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              <span>Seed:</span>
              <input
                type="number"
                className="form-input"
                style={{ width: "75px", padding: "0.3rem 0.5rem" }}
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
              title="Pick a fresh random seed and evaluate a new batch of transactions"
              style={{ padding: "0.4rem 0.65rem" }}
            >
              <Dice5 size={14} className={loading ? "spinner" : ""} />
              Random Seed
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onRunBatch(sampleSize, seed)}
              disabled={loading}
              style={{ padding: "0.4rem 0.85rem" }}
            >
              <Play size={14} className={loading ? "spinner" : ""} />
              {loading ? "Evaluating..." : "Run Benchmark"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: "1rem", background: "var(--rose-bg)", border: "1px solid var(--rose)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "0.75rem", color: "#fca5a5", marginBottom: "1rem" }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Running held-out batch (N={sampleSize}, Seed={seed}) through RecoveryOS decision pipeline & Blind Retry baseline...</p>
        </div>
      )}

      {/* TAB 1: BENCHMARK VIEW */}
      {!loading && activeTab === "benchmark" && ros && baseline && (
        <div>
          <div style={{ marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Evaluated with PRNG Seed <strong>#{seed}</strong> (Deterministic generation). Click <strong>"Random Seed"</strong> or edit <strong>N</strong> to test different transaction volumes.
            </span>
          </div>

          {/* Top-Level Metrics Grid */}
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-label">Transactions Processed</span>
              <span className="metric-value">{ros.total_transactions}</span>
              <span className="metric-sub">Held-out payment events</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Revenue at Risk</span>
              <span className="metric-value">{formatINR(ros.total_at_risk_revenue)}</span>
              <span className="metric-sub">Total failed payment volume</span>
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

          {/* Section C: Comparative A/B Breakdown */}
          <div className="comparison-grid">
            {/* Net Value Improvement Hero Card */}
            <div className="advantage-card">
              <span className="advantage-badge">
                <CheckCircle2 size={13} />
                Net Value Advantage
              </span>
              <div className="advantage-value">
                {improvementPct !== null ? `+${improvementPct.toFixed(1)}%` : "N/A"}
              </div>
              <p className="advantage-desc">
                RecoveryOS generated{" "}
                <strong>{formatINR(batchResult.net_recovered_value_improvement)}</strong> more
                net revenue than blindly retrying every failed transaction.
              </p>

              <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                <div>• Targeted Customer Interventions: <strong>{ros.customer_interventions}</strong></div>
                <div style={{ marginTop: "0.25rem" }}>• Policy Halted Unrecoverable Cases: <strong>{ros.halted_cases}</strong></div>
                <div style={{ marginTop: "0.25rem" }}>• Baseline Blind Retries: <strong>{baseline.total_transactions} (100%)</strong></div>
              </div>
            </div>

            {/* A/B Side-by-Side Table */}
            <div className="comparison-table-container">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Blind Retry Baseline</th>
                    <th>RecoveryOS</th>
                    <th>Delta / Advantage</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Gross Revenue Recovered</td>
                    <td className="mono">{formatINR(baseline.recovered_revenue)}</td>
                    <td className="mono emerald">{formatINR(ros.recovered_revenue)}</td>
                    <td className="mono emerald">
                      +{formatINR(ros.recovered_revenue - baseline.recovered_revenue)}
                    </td>
                  </tr>
                  <tr>
                    <td>Recovery Rate</td>
                    <td className="mono">{formatPercent(baseline.recovery_rate)}</td>
                    <td className="mono emerald">{formatPercent(ros.recovery_rate)}</td>
                    <td className="mono emerald">
                      +{( (ros.recovery_rate - baseline.recovery_rate) * 100 ).toFixed(1)}% pts
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
                    <td>Customer Interventions</td>
                    <td className="mono">0 (Ignored)</td>
                    <td className="mono cyan">{ros.customer_interventions} (Targeted)</td>
                    <td className="mono" style={{ color: "var(--cyan)" }}>Active resolution</td>
                  </tr>
                  <tr>
                    <td>Policy-Halted Fraud/Hard Declines</td>
                    <td className="mono">0 (Blindly retried)</td>
                    <td className="mono rose">{ros.halted_cases} (Stopped)</td>
                    <td className="mono" style={{ color: "var(--rose)" }}>Wasted retries averted</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE OPERATIONAL PIPELINE VIEW */}
      {activeTab === "live" && (
        <div>
          <div style={{ marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Aggregating <strong>{liveTotalCount}</strong> live cases currently tracked in the local database. Updates automatically when you ingest or seed cases.
            </span>
          </div>

          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-label">Live Cases Ingested</span>
              <span className="metric-value">{liveTotalCount}</span>
              <span className="metric-sub">Cases in active database</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Live Revenue at Risk</span>
              <span className="metric-value">{formatINR(liveRevenueAtRisk)}</span>
              <span className="metric-sub">Failed volume ingested</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Live Gross Recovered</span>
              <span className="metric-value emerald">{formatINR(liveRecoveredAmount)}</span>
              <span className="metric-sub">
                Recovery Rate: <strong>{formatPercent(liveRecoveryRate)}</strong>
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Active in Re-evaluate</span>
              <span className="metric-value amber">{liveReevaluateCount}</span>
              <span className="metric-sub">Awaiting next evaluation</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Policy Halted / Unrec.</span>
              <span className="metric-value rose">{liveHaltedCount}</span>
              <span className="metric-sub">Wasted retries blocked</span>
            </div>
          </div>

          <div
            style={{
              marginTop: "1.25rem",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "1rem 1.25rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}>
                <CheckCircle2 size={16} className="emerald" />
                <span>Recovered: <strong>{liveRecoveredCount}</strong></span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}>
                <Clock size={16} className="amber" />
                <span>Sleeping / Re-evaluating: <strong>{liveReevaluateCount}</strong></span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}>
                <XCircle size={16} className="rose" />
                <span>Halted: <strong>{liveHaltedCount}</strong></span>
              </div>
            </div>

            <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              Select any case below in <strong>Decision Replay</strong> to inspect full FSM audit history.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
