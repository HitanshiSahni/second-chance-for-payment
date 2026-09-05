import React, { useState } from "react";
import {
  ShieldCheck,
  Clock,
  RotateCw,
  CheckCircle2,
  XCircle,
  Layers,
  FileText,
} from "lucide-react";
import type {
  AuditEventItem,
  CaseListItem,
  DecisionExplanation,
} from "../types/api";
import { formatINR } from "../services/api";

interface DecisionReplayProps {
  cases: CaseListItem[];
  selectedCaseId: string | null;
  onSelectCase: (caseId: string) => void;
  decision: DecisionExplanation | null;
  auditTrail: AuditEventItem[];
  loadingDecision: boolean;
  onReevaluate: (caseId: string, healthScore?: number) => void;
  reevaluating: boolean;
}

const PIPELINE_STEPS: { key: string; label: string }[] = [
  { key: "PAYMENT_FAILED", label: "1. Payment Failed" },
  { key: "PROFILING", label: "2. Failure Profiled" },
  { key: "POLICY_CHECKED", label: "3. Policy Checked" },
  { key: "ACTION_EVALUATED", label: "4. Actions Evaluated" },
  { key: "ACTION_SELECTED", label: "5. Action Selected" },
  { key: "EXECUTED", label: "6. Outcome / State" },
];

export const DecisionReplay: React.FC<DecisionReplayProps> = ({
  cases,
  selectedCaseId,
  onSelectCase,
  decision,
  auditTrail,
  loadingDecision,
  onReevaluate,
  reevaluating,
}) => {
  const [overrideHealth, setOverrideHealth] = useState<number>(0.95);

  const activeCase = cases.find((c) => c.id === selectedCaseId);

  // Derive stepper progression based on case state and audit trail
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
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <Layers size={18} className="indigo" />
            Decision Replay
          </h2>
          <p className="card-subtitle">
            Inspect the exact failure diagnosis, deterministic policy checks, ML probability predictions, NIR calculation, and audit trail.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <label style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 600 }}>
            Select Case:
          </label>
          <select
            className="form-select"
            style={{ width: "320px" }}
            value={selectedCaseId || ""}
            onChange={(e) => onSelectCase(e.target.value)}
          >
            {cases.length === 0 && <option value="">No cases available</option>}
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.transaction_id} — {c.failure_code} ({formatINR(c.amount)}) [{c.state}]
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingDecision && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading case decision snapshot and audit ledger...</p>
        </div>
      )}

      {!loadingDecision && !activeCase && (
        <div className="empty-state">
          <p>No case selected. Click "Seed Pipeline Cases" or "Ingest Payment Failure" to begin.</p>
        </div>
      )}

      {!loadingDecision && activeCase && (
        <div>
          {/* Visual Pipeline Stepper */}
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
                        <CheckCircle2 size={14} />
                      ) : status === "waiting" ? (
                        <Clock size={14} />
                      ) : status === "halted" ? (
                        <XCircle size={14} />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span>{step.label}</span>
                  </div>
                  {!isLast && (
                    <div
                      className={`step-connector ${
                        status === "completed" ? "active" : ""
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Section E: Transaction Context */}
          <div className="metrics-grid" style={{ marginBottom: "1.5rem" }}>
            <div className="metric-card">
              <span className="metric-label">Transaction Details</span>
              <span className="metric-value" style={{ fontSize: "1.125rem" }}>
                {activeCase.transaction_id}
              </span>
              <span className="metric-sub">
                Amount: <strong>{formatINR(activeCase.amount)}</strong> ({activeCase.currency})
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Failure Classification</span>
              <span className="metric-value" style={{ fontSize: "1.05rem", color: "#f87171" }}>
                {activeCase.failure_code}
              </span>
              <span className="metric-sub">
                Category: <strong>{activeCase.failure_category || "UNKNOWN"}</strong>
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Current FSM State</span>
              <div>
                <span
                  className={`badge ${
                    activeCase.state === "RECOVERED"
                      ? "badge-emerald"
                      : activeCase.state === "HALTED" || activeCase.state === "UNRECOVERABLE"
                      ? "badge-rose"
                      : activeCase.state === "RE_EVALUATE"
                      ? "badge-amber"
                      : "badge-indigo"
                  }`}
                  style={{ fontSize: "0.85rem", padding: "0.25rem 0.6rem" }}
                >
                  {activeCase.state}
                </span>
              </div>
              <span className="metric-sub">
                Re-evaluations: {activeCase.reevaluation_count}/5
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Execution Outcome</span>
              <span className="metric-value" style={{ fontSize: "1.125rem" }}>
                {activeCase.is_recovered ? (
                  <span className="emerald">✓ {formatINR(activeCase.recovered_amount || activeCase.amount)}</span>
                ) : activeCase.state === "RE_EVALUATE" ? (
                  <span className="amber">Scheduled for Next Round</span>
                ) : activeCase.state === "HALTED" ? (
                  <span className="rose">Terminated (0 Cost)</span>
                ) : (
                  <span className="text-secondary">Pending Execution</span>
                )}
              </span>
              <span className="metric-sub">
                Selected: <strong>{activeCase.selected_action || "None"}</strong>
              </span>
            </div>
          </div>

          {/* If Case is in RE_EVALUATE: provide interactive unblock controls */}
          {activeCase.state === "RE_EVALUATE" && (
            <div
              style={{
                background: "var(--amber-bg)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                borderRadius: "var(--radius-md)",
                padding: "1rem 1.25rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--amber)", fontWeight: 700, fontSize: "0.9rem" }}>
                  <Clock size={16} />
                  Case Currently Sleeping in RE_EVALUATE State
                </div>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                  Next evaluation scheduled for:{" "}
                  <strong>{activeCase.next_evaluation_at ? new Date(activeCase.next_evaluation_at).toLocaleTimeString() : "Pending"}</strong>.
                  Test dynamic recovery by triggering re-evaluation now with updated gateway health:
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

          {/* Section F & H: Policy Check & Final Decision Card */}
          <div className="decision-grid">
            {/* Policy Check Card */}
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

              {/* Dynamically evaluate all policy gates from live decision, audit trail, and case state */}
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
                  <>
                    <div className="policy-item">
                      {isHardFailure ? (
                        <XCircle size={16} className="policy-icon fail" />
                      ) : (
                        <CheckCircle2 size={16} className="policy-icon pass" />
                      )}
                      <div>
                        <strong>Hard Failure Classification:</strong>{" "}
                        {isHardFailure
                          ? `Blocked: Failure code '${activeCase.failure_code}' is permanently non-recoverable.`
                          : `Passed: Failure code '${activeCase.failure_code}' is eligible for recovery.`}
                      </div>
                    </div>

                    <div className="policy-item">
                      {retryBlocked ? (
                        <XCircle size={16} className="policy-icon fail" />
                      ) : (
                        <CheckCircle2 size={16} className="policy-icon pass" />
                      )}
                      <div>
                        <strong>Retry Attempt Budget:</strong>{" "}
                        {retryBlocked
                          ? `Exhausted: Max attempts limit reached (${retryAttemptsCount}/3 attempts).`
                          : `Passed: Attempt budget available (${retryAttemptsCount}/3 attempts).`}
                      </div>
                    </div>

                    <div className="policy-item">
                      {windowBlocked ? (
                        <XCircle size={16} className="policy-icon fail" />
                      ) : (
                        <CheckCircle2 size={16} className="policy-icon pass" />
                      )}
                      <div>
                        <strong>Recovery Window:</strong>{" "}
                        {windowBlocked
                          ? `Expired: Case age exceeds configured 96-hour maximum window.`
                          : `Passed: Case age is within the configured 96-hour maximum window.`}
                      </div>
                    </div>

                    <div className="policy-item">
                      {customerBlocked ? (
                        <XCircle size={16} className="policy-icon fail" />
                      ) : (
                        <CheckCircle2 size={16} className="policy-icon pass" />
                      )}
                      <div>
                        <strong>Customer Contact Cooldown:</strong>{" "}
                        {customerBlocked
                          ? `Blocked: ${customerReason || "Customer cooldown or contact limit active."}`
                          : `Passed: Customer is eligible for contact (24h cooldown respected).`}
                      </div>
                    </div>

                    {infraHealthBlocked && (
                      <div className="policy-item">
                        <XCircle size={16} className="policy-icon fail" />
                        <div>
                          <strong>Gateway Circuit Breaker:</strong>{" "}
                          Blocked: {decision?.blocked_actions?.["INFRASTRUCTURE_RECOVERY"]}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {decision?.blocked_actions && Object.keys(decision.blocked_actions).length > 0 && (
                <div style={{ marginTop: "0.5rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--rose)", fontWeight: 600 }}>
                    Blocked Actions Summary ({Object.keys(decision.blocked_actions).length}):
                  </span>
                  {Object.entries(decision.blocked_actions).map(([action, reason]) => (
                    <div key={action} style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                      • <strong>{action}</strong>: {reason}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Final Decision Card */}
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
                  <div style={{ fontSize: "2rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#fff", marginTop: "0.25rem" }}>
                    {(() => {
                      const selEval = decision.evaluations.find(
                        (e) => e.action === decision.selected_action
                      );
                      return selEval ? formatINR(selEval.nir) : "₹0";
                    })()}
                  </div>
                </div>

                <div style={{ background: "rgba(0,0,0,0.25)", padding: "0.75rem 1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                    Economic & Policy Rationale:
                  </span>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-primary)", marginTop: "0.25rem", lineHeight: 1.4 }}>
                    "{decision.selection_reason}"
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section G: Action Evaluation Table */}
          {decision && (
            <div style={{ marginTop: "1.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff" }}>
                  Action Evaluation & Net Incremental Recovery (NIR) Matrix
                </h3>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  NIR = (ΔP × Transaction Amount) − Intervention Cost
                </span>
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
                      <th>Net Incremental Recovery (NIR)</th>
                      <th>Compliance Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {decision.evaluations.map((evalItem) => {
                      const isSelected = evalItem.action === decision.selected_action;
                      const isBlocked = !decision.available_actions.includes(evalItem.action);

                      return (
                        <tr
                          key={evalItem.action}
                          className={`${isSelected ? "selected-row" : ""} ${
                            isBlocked ? "blocked-row" : ""
                          }`}
                        >
                          <td style={{ fontWeight: 600, color: isSelected ? "#fff" : "var(--text-primary)" }}>
                            {evalItem.action}
                            {isSelected && (
                              <span className="badge badge-indigo" style={{ marginLeft: "0.5rem", fontSize: "0.6875rem" }}>
                                WINNER
                              </span>
                            )}
                          </td>
                          <td>{(evalItem.predicted_recovery_probability * 100).toFixed(1)}%</td>
                          <td>{(evalItem.baseline_probability * 100).toFixed(1)}%</td>
                          <td
                            style={{
                              color:
                                evalItem.delta_p > 0
                                  ? "var(--emerald)"
                                  : evalItem.delta_p < 0
                                  ? "var(--rose)"
                                  : "var(--text-muted)",
                            }}
                          >
                            {evalItem.delta_p > 0 ? "+" : ""}
                            {(evalItem.delta_p * 100).toFixed(1)}%
                          </td>
                          <td>{formatINR(evalItem.intervention_cost)}</td>
                          <td
                            style={{
                              fontWeight: 700,
                              fontSize: "0.875rem",
                              color:
                                evalItem.nir >= 0.5
                                  ? "var(--emerald)"
                                  : evalItem.nir < 0
                                  ? "var(--rose)"
                                  : "var(--text-secondary)",
                            }}
                          >
                            {formatINR(evalItem.nir)}
                          </td>
                          <td>
                            {isBlocked ? (
                              <span className="badge badge-rose">Blocked</span>
                            ) : (
                              <span className="badge badge-emerald">Eligible</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Show HALT explicitly as a benchmark option if evaluated */}
                    <tr className={decision.selected_action === "HALT" ? "selected-row" : ""}>
                      <td style={{ fontWeight: 600 }}>
                        HALT
                        {decision.selected_action === "HALT" && (
                          <span className="badge badge-rose" style={{ marginLeft: "0.5rem", fontSize: "0.6875rem" }}>
                            WINNER
                          </span>
                        )}
                      </td>
                      <td>0.0%</td>
                      <td>0.0%</td>
                      <td>0.0%</td>
                      <td>₹0</td>
                      <td>₹0</td>
                      <td>
                        <span className="badge badge-muted">Fallback Terminal</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section I: Audit Trail */}
          <div style={{ marginTop: "2rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FileText size={16} className="indigo" />
              Immutable Audit Ledger Trail ({auditTrail.length} Events)
            </h3>

            <div className="audit-timeline">
              {auditTrail.map((entry) => (
                <div key={entry.event_id} className="audit-entry">
                  <div className="audit-time">
                    {new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      fractionalSecondDigits: 3,
                    })}
                  </div>
                  <div className="audit-event-name">
                    <span className="badge badge-muted">{entry.event_type}</span>
                    {entry.previous_state && entry.new_state && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {entry.previous_state} → <strong>{entry.new_state}</strong>
                      </span>
                    )}
                  </div>
                  {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                    <div className="audit-meta-json">
                      {JSON.stringify(entry.metadata)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
