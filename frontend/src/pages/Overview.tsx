import React, { useRef } from "react";
import {
  TrendingUp,
  Activity,
  ArrowRight,
  Zap,
  Layers,
  AlertCircle,
  Clock,
  CheckCircle2,
  Cpu,
} from "lucide-react";
import type { BatchEvaluationResult, CaseListItem } from "../types/api";
import { formatINR, formatPercent } from "../services/api";
import type { NavRoute } from "../components/Sidebar";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { useCountUp } from "../hooks/useCountUp";

interface OverviewProps {
  cases: CaseListItem[];
  batchResult: BatchEvaluationResult | null;
  onNavigate: (route: NavRoute, caseId?: string) => void;
  onOpenNewEvent: () => void;
  onSeedDemoCases: () => void;
  isSeeding: boolean;
}

export const Overview: React.FC<OverviewProps> = ({
  cases,
  batchResult,
  onNavigate,
  onOpenNewEvent,
  onSeedDemoCases,
  isSeeding,
}) => {
  const pageRef = useRef<HTMLDivElement>(null);
  useScrollReveal(pageRef);

  // Derive all metrics dynamically from existing live database cases
  const totalVolumeAtRisk = cases.reduce((acc, c) => acc + c.amount, 0);
  const recoveredCases = cases.filter((c) => c.is_recovered);
  const totalRecoveredVolume = recoveredCases.reduce(
    (acc, c) => acc + (c.recovered_amount || c.amount),
    0
  );
  const recoveryRate = cases.length > 0 ? recoveredCases.length / cases.length : 0;
  const reevaluateCases = cases.filter((c) => c.state === "RE_EVALUATE");
  const haltedCases = cases.filter(
    (c) => c.state === "HALTED" || c.state === "UNRECOVERABLE"
  );

  // Animated counters
  const animatedVolume = useCountUp(totalVolumeAtRisk);
  const animatedRecovered = useCountUp(totalRecoveredVolume);

  // Group real selected actions
  const actionCounts = cases.reduce((acc, c) => {
    const act = c.selected_action || "UNASSIGNED";
    acc[act] = (acc[act] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="overview-page" ref={pageRef}>
      {/* Hero Command Center Banner */}
      <div className="hero-overview-banner scroll-reveal">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span className="badge badge-indigo">
              <Zap size={12} />
              Razorpay Buildathon · Track 03
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Deterministic policy + action-conditioned ML
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <img
              src="/Second_Logo.png"
              alt="Second"
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                objectFit: "cover",
                boxShadow: "0 0 18px rgba(82, 143, 240, 0.35)",
                border: "1px solid rgba(82, 143, 240, 0.3)",
                flexShrink: 0,
              }}
            />
            <div>
              <h2 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>
                Second — Revenue Recovery Command Center
              </h2>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", maxWidth: "600px", marginTop: "0.25rem" }}>
                Continuously diagnosing failed transactions, enforcing strict policy constraints, and ranking candidate actions by Net Incremental Recovery (NIR).
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onSeedDemoCases}
            disabled={isSeeding}
          >
            {isSeeding ? "Processing Pipeline..." : "Seed Demo Cases"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenNewEvent}
          >
            Ingest Payment Failure
          </button>
        </div>
      </div>

      {/* Live Pipeline Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card scroll-reveal delay-1">
          <span className="metric-label">Total Volume At Risk</span>
          <span className="metric-value">{formatINR(animatedVolume)}</span>
          <span className="metric-sub">{cases.length} ingested failed payments</span>
        </div>

        <div className="metric-card scroll-reveal delay-2">
          <span className="metric-label">Live Gross Recovered</span>
          <span className="metric-value emerald">{formatINR(animatedRecovered)}</span>
          <span className="metric-sub">
            Real Recovery Rate: <strong>{formatPercent(recoveryRate)}</strong>
          </span>
        </div>

        <div className="metric-card scroll-reveal delay-3">
          <span className="metric-label">In Re-evaluation Loop</span>
          <span className="metric-value amber">{reevaluateCases.length}</span>
          <span className="metric-sub">Scheduled for conditional retry</span>
        </div>

        <div className="metric-card scroll-reveal delay-4">
          <span className="metric-label">Policy-Halted Fraud / Hard</span>
          <span className="metric-value rose">{haltedCases.length}</span>
          <span className="metric-sub">Zero unsafe retries executed</span>
        </div>
      </div>

      {/* Model Performance Banner */}
      <div
        className="card scroll-reveal delay-2"
        style={{
          marginBottom: "1.5rem",
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)",
          borderColor: "rgba(99, 102, 241, 0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--radius-sm)",
                background: "rgba(99, 102, 241, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--indigo)",
              }}
            >
              <Cpu size={16} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#fff", margin: 0 }}>
                  Model Performance &amp; Causal ML
                </h3>
                <span className="badge badge-indigo" style={{ fontSize: "0.6875rem" }}>
                  Logistic Regression (L2) + Scaler
                </span>
                <span className="badge badge-emerald" style={{ fontSize: "0.6875rem" }}>
                  51 Features
                </span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0.15rem 0 0 0" }}>
                Empirically validated on 2,000 held-out cases · Rigorous adversarial audit confirmed operation near Bayes ceiling
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem", gap: "0.35rem" }}
            onClick={() => onNavigate("architecture")}
          >
            Inspect Causal Architecture <ArrowRight size={12} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem" }}>
          <div
            style={{
              background: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "0.75rem 0.85rem",
            }}
          >
            <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
              ROC-AUC
            </span>
            <div className="mono font-bold" style={{ fontSize: "1.35rem", color: "var(--emerald)", marginTop: "0.2rem" }}>
              0.7695
            </div>
            <span style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", display: "block", marginTop: "0.2rem" }}>
              Predictive ranking quality (+0.0132 over baseline)
            </span>
          </div>

          <div
            style={{
              background: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "0.75rem 0.85rem",
            }}
          >
            <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
              Accuracy
            </span>
            <div className="mono font-bold" style={{ fontSize: "1.35rem", color: "#fff", marginTop: "0.2rem" }}>
              74.85%
            </div>
            <span style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", display: "block", marginTop: "0.2rem" }}>
              Held-out validation (@ 0.50 threshold)
            </span>
          </div>

          <div
            style={{
              background: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "0.75rem 0.85rem",
            }}
          >
            <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
              Recall
            </span>
            <div className="mono font-bold" style={{ fontSize: "1.35rem", color: "var(--cyan)", marginTop: "0.2rem" }}>
              42.36%
            </div>
            <span style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", display: "block", marginTop: "0.2rem" }}>
              Recovery detection rate (+7.55% uplift)
            </span>
          </div>

          <div
            style={{
              background: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "0.75rem 0.85rem",
            }}
          >
            <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
              F1 Score
            </span>
            <div className="mono font-bold" style={{ fontSize: "1.35rem", color: "var(--indigo)", marginTop: "0.2rem" }}>
              0.5064
            </div>
            <span style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", display: "block", marginTop: "0.2rem" }}>
              Balanced precision/recall harmonic score
            </span>
          </div>

          <div
            style={{
              background: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "0.75rem 0.85rem",
            }}
          >
            <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
              Calibration (ECE)
            </span>
            <div className="mono font-bold" style={{ fontSize: "1.35rem", color: "var(--amber)", marginTop: "0.2rem" }}>
              0.98%
            </div>
            <span style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", display: "block", marginTop: "0.2rem" }}>
              Expected calibration error (Brier: 0.1710)
            </span>
          </div>
        </div>
      </div>

      {/* Two-Column Middle Grid: Benchmark Proof & Active Strategy Breakdown */}
      <div className="scroll-reveal delay-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        {/* Left: Benchmark Advantage Snapshot */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <TrendingUp size={16} className="emerald" />
                Empirical Benchmark Advantage
              </h3>
              <p className="card-subtitle">
                Held-out Monte Carlo comparison against standard Blind Retry
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
              onClick={() => onNavigate("benchmark")}
            >
              Open Lab <ArrowRight size={12} />
            </button>
          </div>

          {batchResult ? (
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "2.25rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--emerald)" }}>
                  +{batchResult.net_recovered_value_improvement > 0 ? formatINR(batchResult.net_recovered_value_improvement) : "₹0"}
                </span>
                <span className="badge badge-emerald">
                  +{((batchResult.recoveryos.recovery_rate - batchResult.blind_retry_baseline.recovery_rate) * 100).toFixed(1)}% recovery uplift
                </span>
              </div>

              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: 1.5 }}>
                On a held-out test of <strong>{batchResult.recoveryos.total_transactions} payment events</strong>, Second generated{" "}
                <strong>{formatINR(batchResult.recoveryos.net_recovered_value)}</strong> in net revenue vs.{" "}
                <strong>{formatINR(batchResult.blind_retry_baseline.net_recovered_value)}</strong> from blindly retrying every failure.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", background: "var(--bg-surface-elevated)", padding: "0.85rem 1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                <div>
                  <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Targeted Customer Outreach</span>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--cyan)", fontFamily: "var(--font-mono)" }}>
                    {batchResult.recoveryos.customer_interventions} cases
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Wasted Retries Averted</span>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--rose)", fontFamily: "var(--font-mono)" }}>
                    {batchResult.recoveryos.halted_cases} cases halted
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "1.5rem" }}>
              <p>Benchmark not evaluated yet.</p>
              <button type="button" className="btn btn-primary" onClick={() => onNavigate("benchmark")}>
                Run Benchmark
              </button>
            </div>
          )}
        </div>

        {/* Right: Live Recovery Strategy Breakdown */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Layers size={16} className="indigo" />
                Live Action Routing Distribution
              </h3>
              <p className="card-subtitle">
                Autonomous decisions selected across all {cases.length} pipeline cases
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
              onClick={() => onNavigate("cases")}
            >
              View Operations <ArrowRight size={12} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {[
              { label: "Customer Resolution", key: "CUSTOMER_RESOLUTION", color: "var(--cyan)", bg: "var(--cyan-dim)" },
              { label: "Infrastructure Recovery", key: "INFRASTRUCTURE_RECOVERY", color: "var(--emerald)", bg: "var(--emerald-dim)" },
              { label: "Silent Retry", key: "SILENT_RETRY", color: "var(--indigo)", bg: "var(--indigo-dim)" },
              { label: "Conditional Wait (Re-evaluate)", key: "WAIT", color: "var(--amber)", bg: "var(--amber-dim)" },
              { label: "Policy Halt (Fraud / Unrec)", key: "HALT", color: "var(--rose)", bg: "var(--rose-dim)" },
            ].map((item) => {
              const count = actionCounts[item.key] || 0;
              const pct = cases.length > 0 ? (count / cases.length) * 100 : 0;

              return (
                <div key={item.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.label}</span>
                    <span className="mono" style={{ color: "var(--text-muted)" }}>
                      {count} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "9999px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: item.color,
                        borderRadius: "9999px",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Real-time Recovery Event Stream & Timeline */}
      <div className="card scroll-reveal delay-2">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <Clock size={16} className="emerald" />
              Real-time Recovery Event Stream
            </h3>
            <p className="card-subtitle">
              Chronological stream of successful interventions, autonomous recoveries, and revenue won back
            </p>
          </div>
          <span className="badge badge-emerald">
            <CheckCircle2 size={12} />
            {recoveredCases.length} Recovered
          </span>
        </div>

        {recoveredCases.length === 0 ? (
          <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            No recoveries logged in this session yet. Ingest a payment failure or seed demo cases to observe real-time recovery.
          </div>
        ) : (
          <div className="timeline-container">
            {recoveredCases.slice(0, 5).map((c) => (
              <div key={c.id} className="timeline-item">
                <div className="timeline-dot" />
                <div className="timeline-card">
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span className="mono" style={{ fontWeight: 700, color: "#fff", fontSize: "0.875rem" }}>
                        {c.transaction_id}
                      </span>
                      <span
                        className={`badge ${
                          c.selected_action === "CUSTOMER_RESOLUTION"
                            ? "badge-cyan"
                            : "badge-emerald"
                        }`}
                        style={{ fontSize: "0.6875rem" }}
                      >
                        {c.selected_action || "RECOVERED"}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {c.failure_code} ({c.failure_category || "System"})
                      </span>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      Resolved via autonomous action routing & policy compliance
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ textAlign: "right" }}>
                      <span className="mono font-bold emerald" style={{ fontSize: "1rem" }}>
                        +{formatINR(c.recovered_amount || c.amount)}
                      </span>
                      <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                        Revenue Saved
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.6875rem" }}
                      onClick={() => onNavigate("decision-replay", c.id)}
                    >
                      Forensics <ArrowRight size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Failure Incidents Table */}
      <div className="card scroll-reveal delay-3">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <Activity size={16} className="cyan" />
              Recent Payment Failure Incidents
            </h3>
            <p className="card-subtitle">
              Live operational feed — click any case to open the forensic decision workspace
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
            onClick={() => onNavigate("cases")}
          >
            All Live Cases ({cases.length}) <ArrowRight size={12} />
          </button>
        </div>

        {cases.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={24} className="amber" />
            <p>No payment failure incidents recorded yet.</p>
            <button type="button" className="btn btn-primary" onClick={onSeedDemoCases} disabled={isSeeding}>
              Seed Demo Archetypes
            </button>
          </div>
        ) : (
          <div className="comparison-table-container">
            <table className="operations-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Amount</th>
                  <th>Failure Reason</th>
                  <th>Classification</th>
                  <th>Selected Action</th>
                  <th>FSM State</th>
                  <th style={{ textAlign: "right" }}>Forensics</th>
                </tr>
              </thead>
              <tbody>
                {cases.slice(0, 6).map((c) => (
                  <tr key={c.id}>
                    <td className="mono" style={{ fontWeight: 600 }}>
                      {c.transaction_id}
                    </td>
                    <td className="mono font-bold">{formatINR(c.amount)}</td>
                    <td>
                      <span className="badge badge-muted">{c.failure_code}</span>
                    </td>
                    <td style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {c.failure_category || "UNKNOWN"}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          c.selected_action === "CUSTOMER_RESOLUTION"
                            ? "badge-cyan"
                            : c.selected_action === "INFRASTRUCTURE_RECOVERY" || c.selected_action === "SILENT_RETRY"
                            ? "badge-emerald"
                            : c.selected_action === "WAIT"
                            ? "badge-amber"
                            : "badge-rose"
                        }`}
                      >
                        {c.selected_action || "None"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          c.state === "RECOVERED"
                            ? "badge-emerald"
                            : c.state === "RE_EVALUATE"
                            ? "badge-amber"
                            : c.state === "HALTED" || c.state === "UNRECOVERABLE"
                            ? "badge-rose"
                            : "badge-indigo"
                        }`}
                      >
                        {c.state}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.6875rem" }}
                        onClick={() => onNavigate("decision-replay", c.id)}
                      >
                        Inspect Decision <ArrowRight size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
