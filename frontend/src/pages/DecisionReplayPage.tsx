import React, { useState } from "react";
import {
  ShieldCheck,
  Clock,
  RotateCw,
  CheckCircle2,
  XCircle,
  Layers,
  FileText,
  Search,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type {
  AuditEventItem,
  CaseListItem,
  DecisionExplanation,
} from "../types/api";
import { formatINR, formatPercent } from "../services/api";

interface DecisionReplayPageProps {
  cases: CaseListItem[];
  selectedCaseId: string | null;
  onSelectCase: (caseId: string) => void;
  decision: DecisionExplanation | null;
  auditTrail: AuditEventItem[];
  loadingDecision: boolean;
  onReevaluate: (caseId: string, healthScore?: number) => void;
  reevaluating: boolean;
  onOpenNewEvent: () => void;
}

const PIPELINE_STEPS = [
  { key: "PAYMENT_FAILED", label: "1. Payment Failed" },
  { key: "PROFILING", label: "2. Failure Profiled" },
  { key: "POLICY_CHECKED", label: "3. Policy Checked" },
  { key: "ACTION_EVALUATED", label: "4. Actions Scored" },
  { key: "ACTION_SELECTED", label: "5. Action Selected" },
  { key: "EXECUTED", label: "6. Outcome / State" },
];

export const DecisionReplayPage: React.FC<DecisionReplayPageProps> = ({
  cases,
  selectedCaseId,
  onSelectCase,
  decision,
  auditTrail,
  loadingDecision,
  onReevaluate,
  reevaluating,
  onOpenNewEvent,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [overrideHealth, setOverrideHealth] = useState<number>(0.95);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  const activeCase = cases.find((c) => c.id === selectedCaseId);

  const filteredCases = cases.filter(
    (c) =>
      c.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.failure_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.customer_id && c.customer_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStepStatus = (stepKey: string) => {
    if (!activeCase) return "pending";
    const state = activeCase.state;

    if (stepKey === "PAYMENT_FAILED") return "completed";
    if (stepKey === "PROFILING") return "completed";
    if (stepKey === "POLICY_CHECKED") return "completed";
    if (stepKey === "ACTION_EVALUATED") return "completed";
    if (stepKey === "ACTION_SELECTED") return "completed";

    if (stepKey === "EXECUTED") {
      if (state === "RECOVERED") return "completed";
      if (state === "HALTED" || state === "UNRECOVERABLE") return "halted";
      if (state === "RE_EVALUATE") return "waiting";
      return "active";
    }
    return "completed";
  };

  const isHardFailure =
    activeCase?.failure_code === "FRAUD_SUSPECTED" ||
    activeCase?.failure_code === "CARD_REPORTED_LOST_OR_STOLEN" ||
    activeCase?.failure_code === "ACCOUNT_CLOSED";

  return (
    <div className="decision-workspace-page">
      <div className="workspace-layout">
        {/* Left Column: Searchable Case Selector Navigator */}
        <div className="case-sidebar-pane">
          <div className="case-sidebar-header">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Case Navigator
              </span>
              <span className="badge badge-muted">{cases.length} cases</span>
            </div>

            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search transaction ID..."
                className="form-input"
                style={{ width: "100%", paddingLeft: "2rem" }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search
                size={14}
                style={{ position: "absolute", left: "0.65rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
              />
            </div>
          </div>

          <div className="case-list-scroll">
            {filteredCases.length === 0 ? (
              <div style={{ padding: "1.5rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                No matching transactions found.
              </div>
            ) : (
              filteredCases.map((c) => {
                const isSelected = c.id === selectedCaseId;
                return (
                  <div
                    key={c.id}
                    className={`case-list-item ${isSelected ? "active" : ""}`}
                    onClick={() => onSelectCase(c.id)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="mono" style={{ fontWeight: 600, fontSize: "0.8125rem", color: isSelected ? "#fff" : "var(--text-primary)" }}>
                        {c.transaction_id}
                      </span>
                      <span className="mono" style={{ fontSize: "0.8125rem", fontWeight: 700 }}>
                        {formatINR(c.amount)}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.2rem" }}>
                      <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                        {c.failure_code}
                      </span>
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
                        style={{ fontSize: "0.6875rem", padding: "0.1rem 0.4rem" }}
                      >
                        {c.state}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Forensic Investigation Canvas */}
        <div className="investigation-canvas">
          {loadingDecision && (
            <div className="card loading-state">
              <div className="spinner" />
              <p>Retrieving case decision snapshot and forensic audit ledger...</p>
            </div>
          )}

          {!loadingDecision && !activeCase && (
            <div className="card empty-state">
              <AlertCircle size={28} className="amber" />
              <h3 style={{ color: "#fff", fontWeight: 700 }}>No Case Selected for Investigation</h3>
              <p style={{ maxWidth: "400px" }}>
                Select a transaction from the Case Navigator on the left, or ingest a new payment failure event.
              </p>
              <button type="button" className="btn btn-primary" onClick={onOpenNewEvent}>
                Ingest Payment Failure
              </button>
            </div>
          )}

          {!loadingDecision && activeCase && (
            <div>
              {/* Visual 6-Step FSM Pipeline Stepper */}
              <div className="pipeline-stepper">
                {PIPELINE_STEPS.map((step, idx) => {
                  const status = getStepStatus(step.key);
                  const isLast = idx === PIPELINE_STEPS.length - 1;

                  return (
                    <React.Fragment key={step.key}>
                      <div
                        className={`step-item ${
                          status === "completed"
                            ? "completed"
                            : status === "active" || status === "waiting"
                            ? "active"
                            : ""
                        }`}
                      >
                        <div className="step-circle">
                          {status === "completed" ? (
                            <CheckCircle2 size={13} />
                          ) : status === "waiting" ? (
                            <Clock size={13} />
                          ) : status === "halted" ? (
                            <XCircle size={13} />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <span>{step.label}</span>
                      </div>
                      {!isLast && (
                        <div className={`step-connector ${status === "completed" ? "active" : ""}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Transaction Profile Header Card */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <span className="metric-label">Transaction Profile</span>
                  <span className="metric-value" style={{ fontSize: "1.2rem" }}>
                    {activeCase.transaction_id}
                  </span>
                  <span className="metric-sub">
                    Amount: <strong>{formatINR(activeCase.amount)}</strong> ({activeCase.currency})
                  </span>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Failure Classification</span>
                  <span className="metric-value rose" style={{ fontSize: "1.1rem" }}>
                    {activeCase.failure_code}
                  </span>
                  <span className="metric-sub">
                    Category: <strong>{activeCase.failure_category || "UNKNOWN"}</strong>
                  </span>
                </div>

                <div className="metric-card">
                  <span className="metric-label">FSM State & Budget</span>
                  <div>
                    <span
                      className={`badge ${
                        activeCase.state === "RECOVERED"
                          ? "badge-emerald"
                          : activeCase.state === "RE_EVALUATE"
                          ? "badge-amber"
                          : activeCase.state === "HALTED" || activeCase.state === "UNRECOVERABLE"
                          ? "badge-rose"
                          : "badge-indigo"
                      }`}
                    >
                      {activeCase.state}
                    </span>
                  </div>
                  <span className="metric-sub">
                    Re-evaluations: {activeCase.reevaluation_count} / 5 used
                  </span>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Recovery Outcome</span>
                  <span className="metric-value" style={{ fontSize: "1.15rem" }}>
                    {activeCase.is_recovered ? (
                      <span className="emerald">✓ {formatINR(activeCase.recovered_amount || activeCase.amount)}</span>
                    ) : activeCase.state === "RE_EVALUATE" ? (
                      <span className="amber">Awaiting Re-evaluation</span>
                    ) : activeCase.state === "HALTED" ? (
                      <span className="rose">Terminated (Zero Cost)</span>
                    ) : (
                      <span className="text-secondary">Pending Execution</span>
                    )}
                  </span>
                  <span className="metric-sub">
                    Selected Action: <strong>{activeCase.selected_action || "None"}</strong>
                  </span>
                </div>
              </div>

              {/* Conditional Re-evaluation Controller (When Case is in RE_EVALUATE) */}
              {activeCase.state === "RE_EVALUATE" && (
                <div
                  style={{
                    background: "var(--amber-dim)",
                    border: "1px solid var(--amber-border)",
                    borderRadius: "var(--radius-md)",
                    padding: "1rem 1.25rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1.5rem",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--amber)", fontWeight: 700, fontSize: "0.9rem" }}>
                      <Clock size={16} />
                      Case Sleeping in RE_EVALUATE State
                    </div>
                    <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                      Next evaluation scheduled for:{" "}
                      <strong>{activeCase.next_evaluation_at ? new Date(activeCase.next_evaluation_at).toLocaleTimeString() : "Pending"}</strong>.
                      Simulate gateway recovery by testing with updated gateway health:
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8125rem" }}>
                      <span>Gateway Health:</span>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        className="form-input"
                        style={{ width: "70px", padding: "0.25rem 0.5rem" }}
                        value={overrideHealth}
                        onChange={(e) => setOverrideHealth(Number(e.target.value))}
                      />
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => onReevaluate(activeCase.id, overrideHealth)}
                      disabled={reevaluating}
                    >
                      <RotateCw size={14} className={reevaluating ? "spinner" : ""} />
                      {reevaluating ? "Re-evaluating..." : "Trigger Re-evaluation"}
                    </button>
                  </div>
                </div>
              )}

              {/* Two-Column: Deterministic Policy Gate vs. Economic Decision Hero */}
              <div className="decision-grid">
                {/* Deterministic Policy Compliance Gate */}
                <div className="policy-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <ShieldCheck size={16} className={isHardFailure ? "rose" : "emerald"} />
                      Deterministic Policy Compliance Gate
                    </h3>
                    <span className={`badge ${isHardFailure ? "badge-rose" : "badge-emerald"}`}>
                      {isHardFailure ? "Hard Failure Blocked" : "Policy Passed"}
                    </span>
                  </div>

                  {(() => {
                    const retryAttemptsCount = auditTrail.filter(
                      (e) =>
                        e.metadata?.action === "SILENT_RETRY" ||
                        e.metadata?.action === "INFRASTRUCTURE_RECOVERY"
                    ).length;

                    const retryBlocked = Boolean(
                      retryAttemptsCount >= 3 ||
                      (decision?.blocked_actions &&
                        decision.blocked_actions["SILENT_RETRY"]?.toLowerCase().includes("max retry"))
                    );

                    const windowBlocked = Boolean(
                      decision?.blocked_actions &&
                      Object.values(decision.blocked_actions).some((r) => r.toLowerCase().includes("window"))
                    );

                    const customerBlocked = Boolean(
                      decision?.blocked_actions && decision.blocked_actions["CUSTOMER_RESOLUTION"]
                    );
                    const customerReason = decision?.blocked_actions?.["CUSTOMER_RESOLUTION"];

                    const infraHealthBlocked = Boolean(
                      decision?.blocked_actions &&
                      decision.blocked_actions["INFRASTRUCTURE_RECOVERY"]?.toLowerCase().includes("health")
                    );

                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                        <div className="policy-item">
                          {isHardFailure ? (
                            <XCircle size={15} className="rose" style={{ flexShrink: 0, marginTop: "2px" }} />
                          ) : (
                            <CheckCircle2 size={15} className="emerald" style={{ flexShrink: 0, marginTop: "2px" }} />
                          )}
                          <div>
                            <strong>Hard Failure Check:</strong>{" "}
                            {isHardFailure
                              ? `Blocked: Failure code '${activeCase.failure_code}' is unrecoverable.`
                              : `Passed: Failure code '${activeCase.failure_code}' is eligible for recovery.`}
                          </div>
                        </div>

                        <div className="policy-item">
                          {retryBlocked ? (
                            <XCircle size={15} className="rose" style={{ flexShrink: 0, marginTop: "2px" }} />
                          ) : (
                            <CheckCircle2 size={15} className="emerald" style={{ flexShrink: 0, marginTop: "2px" }} />
                          )}
                          <div>
                            <strong>Retry Budget:</strong>{" "}
                            {retryBlocked
                              ? `Exhausted: Max attempts limit reached (${retryAttemptsCount}/3 attempts).`
                              : `Passed: Attempt budget available (${retryAttemptsCount}/3 attempts).`}
                          </div>
                        </div>

                        <div className="policy-item">
                          {windowBlocked ? (
                            <XCircle size={15} className="rose" style={{ flexShrink: 0, marginTop: "2px" }} />
                          ) : (
                            <CheckCircle2 size={15} className="emerald" style={{ flexShrink: 0, marginTop: "2px" }} />
                          )}
                          <div>
                            <strong>Recovery Window:</strong>{" "}
                            {windowBlocked
                              ? `Expired: Case age exceeds configured 96-hour maximum window.`
                              : `Passed: Within configured 96-hour maximum window.`}
                          </div>
                        </div>

                        <div className="policy-item">
                          {customerBlocked ? (
                            <XCircle size={15} className="rose" style={{ flexShrink: 0, marginTop: "2px" }} />
                          ) : (
                            <CheckCircle2 size={15} className="emerald" style={{ flexShrink: 0, marginTop: "2px" }} />
                          )}
                          <div>
                            <strong>Customer Cooldown:</strong>{" "}
                            {customerBlocked
                              ? `Blocked: ${customerReason || "Customer cooldown or contact limit active."}`
                              : `Passed: Customer eligible for contact (24h cooldown respected).`}
                          </div>
                        </div>

                        {infraHealthBlocked && (
                          <div className="policy-item">
                            <XCircle size={15} className="rose" style={{ flexShrink: 0, marginTop: "2px" }} />
                            <div>
                              <strong>Gateway Circuit Breaker:</strong>{" "}
                              Blocked: {decision?.blocked_actions?.["INFRASTRUCTURE_RECOVERY"]}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {decision?.blocked_actions && Object.keys(decision.blocked_actions).length > 0 && (
                    <div style={{ marginTop: "0.5rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.5rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--rose)", fontWeight: 600 }}>
                        Blocked Actions Summary ({Object.keys(decision.blocked_actions).length}):
                      </span>
                      {Object.entries(decision.blocked_actions).map(([action, reason]) => (
                        <div key={action} style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                          • <strong>{action}</strong>: {reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Optimal Decision Card */}
                {decision && (
                  <div className={`hero-decision-card ${decision.selected_action}`}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", fontWeight: 700 }}>
                        Selected Optimal Action
                      </span>
                      <span
                        className={`badge ${
                          decision.selected_action === "CUSTOMER_RESOLUTION"
                            ? "badge-cyan"
                            : decision.selected_action === "SILENT_RETRY" || decision.selected_action === "INFRASTRUCTURE_RECOVERY"
                            ? "badge-emerald"
                            : decision.selected_action === "WAIT"
                            ? "badge-amber"
                            : "badge-rose"
                        }`}
                        style={{ fontSize: "0.85rem", padding: "0.25rem 0.6rem" }}
                      >
                        {decision.selected_action}
                      </span>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                        Expected Net Incremental Recovery (NIR):
                      </div>
                      <div style={{ fontSize: "2.25rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#fff", marginTop: "0.25rem" }}>
                        {(() => {
                          const selEval = decision.evaluations.find(
                            (e) => e.action === decision.selected_action
                          );
                          return selEval ? formatINR(selEval.nir) : "₹0";
                        })()}
                      </div>
                    </div>

                    <div style={{ background: "rgba(0,0,0,0.3)", padding: "0.85rem 1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                      <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                        Economic & Policy Rationale:
                      </span>
                      <p style={{ fontSize: "0.8125rem", color: "var(--text-primary)", marginTop: "0.25rem", lineHeight: 1.45 }}>
                        "{decision.selection_reason}"
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Evaluation & NIR Matrix */}
              {decision && (
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h3 className="card-title">
                        <Layers size={16} className="cyan" />
                        Action Evaluation & Net Incremental Recovery (NIR) Matrix
                      </h3>
                      <p className="card-subtitle">
                        Formula: NIR = (ΔP × Transaction Value) − Intervention Cost
                      </p>
                    </div>
                    <span className="badge badge-muted">Threshold: ≥ ₹0.50</span>
                  </div>

                  <div className="action-table-container">
                    <table className="action-table">
                      <thead>
                        <tr>
                          <th>Action</th>
                          <th>P(Recovery)</th>
                          <th>Baseline P(Wait)</th>
                          <th>ΔP (Incremental)</th>
                          <th>Intervention Cost</th>
                          <th>Expected NIR</th>
                          <th>Status / Outcome</th>
                        </tr>
                      </thead>
                      <tbody>
                        {decision.evaluations.map((ev) => {
                          const isWinner = ev.action === decision.selected_action;
                          return (
                            <tr key={ev.action} style={{ background: isWinner ? "rgba(16, 185, 129, 0.05)" : undefined }}>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                  <strong style={{ color: isWinner ? "var(--emerald)" : "#fff" }}>
                                    {ev.action}
                                  </strong>
                                  {isWinner && (
                                    <span className="badge badge-emerald" style={{ fontSize: "0.65rem", padding: "0.1rem 0.35rem" }}>
                                      SELECTED WINNER
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="mono font-bold">
                                {formatPercent(ev.predicted_recovery_probability)}
                              </td>
                              <td className="mono text-secondary">
                                {formatPercent(ev.baseline_probability)}
                              </td>
                              <td className="mono" style={{ color: ev.delta_p >= 0 ? "var(--emerald)" : "var(--rose)" }}>
                                {ev.delta_p >= 0 ? `+${(ev.delta_p * 100).toFixed(1)}%` : `${(ev.delta_p * 100).toFixed(1)}%`}
                              </td>
                              <td className="mono text-secondary">
                                {formatINR(ev.intervention_cost)}
                              </td>
                              <td
                                className="mono"
                                style={{
                                  fontWeight: 700,
                                  fontSize: "0.95rem",
                                  color: ev.nir >= 0.5 ? "var(--emerald)" : ev.nir < 0 ? "var(--rose)" : "var(--amber)",
                                }}
                              >
                                {formatINR(ev.nir)}
                              </td>
                              <td>
                                {isWinner ? (
                                  <span className="badge badge-emerald">Optimal ROI</span>
                                ) : ev.nir < 0.5 ? (
                                  <span className="badge badge-muted">Sub-threshold</span>
                                ) : (
                                  <span className="badge badge-muted">Lower NIR</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Immutable Audit Ledger Timeline */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">
                      <FileText size={16} className="indigo" />
                      Forensic Audit Ledger & State Transitions
                    </h3>
                    <p className="card-subtitle">
                      Append-only cryptographically verifiable decision history for Case #{activeCase.transaction_id}
                    </p>
                  </div>
                  <span className="badge badge-muted">{auditTrail.length} recorded events</span>
                </div>

                <div className="timeline">
                  {auditTrail.map((event, idx) => {
                    const isExpanded = expandedAuditId === event.event_id;
                    return (
                      <div key={event.event_id} className="timeline-item">
                        <div className="timeline-icon">
                          {idx + 1}
                        </div>
                        <div className="timeline-content">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div className="timeline-title">
                              <span>{event.event_type}</span>
                              {event.new_state && (
                                <span className="badge badge-muted" style={{ fontSize: "0.6875rem" }}>
                                  State: {event.new_state}
                                </span>
                              )}
                            </div>
                            <span className="mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              {new Date(event.timestamp).toLocaleTimeString()}
                            </span>
                          </div>

                          <div className="timeline-meta">
                            {event.previous_state && (
                              <span>Transition: <strong>{event.previous_state}</strong> → <strong>{event.new_state}</strong></span>
                            )}
                          </div>

                          {event.metadata && Object.keys(event.metadata).length > 0 && (
                            <div style={{ marginTop: "0.4rem" }}>
                              <button
                                type="button"
                                onClick={() => setExpandedAuditId(isExpanded ? null : event.event_id)}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "var(--text-secondary)",
                                  fontSize: "0.75rem",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                  padding: 0,
                                }}
                              >
                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                {isExpanded ? "Hide Metadata" : "View Event Metadata"}
                              </button>

                              {isExpanded && (
                                <pre
                                  style={{
                                    marginTop: "0.4rem",
                                    padding: "0.75rem",
                                    background: "rgba(0,0,0,0.35)",
                                    border: "1px solid var(--border-subtle)",
                                    borderRadius: "var(--radius-sm)",
                                    fontSize: "0.75rem",
                                    fontFamily: "var(--font-mono)",
                                    color: "var(--cyan)",
                                    overflowX: "auto",
                                  }}
                                >
                                  {JSON.stringify(event.metadata, null, 2)}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
