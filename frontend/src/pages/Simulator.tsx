import React, { useState, useRef } from "react";
import {
  Sliders,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  Cpu,
  Clock,
} from "lucide-react";
import { api, formatINR, formatPercent } from "../services/api";
import type { DecisionExplanation, PaymentFailureEvent, ActionEvaluation } from "../types/api";
import type { NavRoute } from "../components/Sidebar";
import { useScrollReveal } from "../hooks/useScrollReveal";

interface SimulatorProps {
  onNavigate: (route: NavRoute, caseId?: string) => void;
  onCaseCreated?: () => void;
}

const COMMON_FAILURE_CODES = [
  { code: "GATEWAY_TIMEOUT", label: "Gateway Timeout (Infrastructure)", category: "Infrastructure Transient" },
  { code: "NETWORK_ERROR", label: "Network Error (Connection Drop)", category: "Infrastructure Transient" },
  { code: "RATE_LIMITED", label: "Rate Limited (Spike Throttling)", category: "Infrastructure Transient" },
  { code: "INSUFFICIENT_FUNDS", label: "Insufficient Funds (Soft Decline)", category: "Temporary Payment Issue" },
  { code: "ISSUER_DECLINED_SOFT", label: "Issuer Declined Soft (Temporary Issue)", category: "Temporary Payment Issue" },
  { code: "CARD_EXPIRED", label: "Card Expired (Lifecycle Event)", category: "Payment Method Issue" },
  { code: "3DS_AUTHENTICATION_REQUIRED", label: "3DS Authentication Required (Drop-off)", category: "Customer Action Required" },
  { code: "OTP_FAILED", label: "OTP Failed (Customer Action Required)", category: "Customer Action Required" },
  { code: "CARD_REPORTED_LOST_OR_STOLEN", label: "Card Reported Lost or Stolen (Hard Block)", category: "Hard Unrecoverable" },
  { code: "FRAUD_SUSPECTED", label: "Fraud Suspected (Deterministic Halt)", category: "Hard Unrecoverable" },
];

export const Simulator: React.FC<SimulatorProps> = ({ onNavigate, onCaseCreated }) => {
  const [amount, setAmount] = useState<number>(3499);
  const [failureCode, setFailureCode] = useState<string>("GATEWAY_TIMEOUT");
  const [gateway, setGateway] = useState<string>("GATEWAY_A");
  const [gatewayHealth, setGatewayHealth] = useState<number>(0.35);
  const [customerTenure, setCustomerTenure] = useState<number>(180);
  const [previousAttempts, setPreviousAttempts] = useState<number>(1);
  const [previousFailures, setPreviousFailures] = useState<number>(0);
  const [previousSuccesses, setPreviousSuccesses] = useState<number>(6);
  const [isRecurring, setIsRecurring] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [decisionResult, setDecisionResult] = useState<DecisionExplanation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: PaymentFailureEvent = {
      transaction_id: `SIM-${Date.now().toString().slice(-6)}`,
      amount,
      currency: "INR",
      failure_code: failureCode,
      gateway,
      gateway_health_score: gatewayHealth,
      customer_id: `cust_sim_${Math.floor(Math.random() * 9000 + 1000)}`,
      customer_tenure_days: customerTenure,
      previous_attempts: previousAttempts,
      previous_failures: previousFailures,
      previous_successful_payments: previousSuccesses,
      is_recurring: isRecurring,
    };

    try {
      // Direct real backend call to POST /cases/
      const result = await api.submitFailureEvent(payload);
      setDecisionResult(result);
      if (onCaseCreated) {
        onCaseCreated();
      }
    } catch (err: any) {
      setError(err.message || "Failed to execute simulation against backend.");
    } finally {
      setLoading(false);
    }
  };

  const pageRef = useRef<HTMLDivElement>(null);
  useScrollReveal(pageRef);

  return (
    <div className="simulator-page" ref={pageRef}>
      {/* Transparency Banner */}
      <div
        className="scroll-reveal"
        style={{
          background: "rgba(15, 23, 42, 0.75)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "flex-start",
          gap: "1rem",
        }}
      >
        <div
          style={{
            padding: "0.5rem",
            borderRadius: "var(--radius-sm)",
            background: "rgba(56, 189, 248, 0.1)",
            color: "var(--cyan)",
            display: "flex",
          }}
        >
          <Cpu size={20} />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h4 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#fff", margin: 0 }}>
              Live Backend Decision Sandbox
            </h4>
            <span className="badge badge-emerald">Real Engine Execution</span>
          </div>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.25rem", marginBottom: 0, lineHeight: 1.5 }}>
            This simulator runs directly through the active Python decision pipeline (<code>POST /cases/</code>).
            Every policy check, predicted recovery probability, and Net Incremental Recovery (NIR) score displayed below is computed
            by the real S-Learner ML model and deterministic rules. No fake or mock probabilities are generated.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%", maxWidth: "100%" }}>
        {/* Box 1: Parameter Controls (Full Width) */}
        <div className="card scroll-reveal delay-1" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Sliders size={16} className="cyan" />
                Transaction &amp; Environment Inputs
              </h3>
              <p className="card-subtitle">
                Configure payment attributes to test how the policy and ML engines respond
              </p>
            </div>
          </div>

          <form onSubmit={handleRunSimulation}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Primary Controls Grid: 2x2 balanced layout */}
              <div className="sim-controls-grid">
                {/* Row 1, Col 1: Payment Amount */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="sim-amount" style={{ display: "block", marginBottom: "0.4rem" }}>
                    Payment Amount (INR)
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <input
                      id="sim-amount"
                      type="number"
                      min="1"
                      step="1"
                      className="form-input mono"
                      style={{ flex: 1 }}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      required
                    />
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      {[999, 3499, 12500].map((quickVal) => (
                        <button
                          key={quickVal}
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: "0.6875rem", padding: "0.3rem 0.55rem" }}
                          onClick={() => setAmount(quickVal)}
                        >
                          ₹{quickVal.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Row 1, Col 2: Failure Code */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="sim-failure-code" style={{ display: "block", marginBottom: "0.4rem" }}>
                    Failure Reason Archetype
                  </label>
                  <select
                    id="sim-failure-code"
                    className="form-input"
                    style={{ width: "100%" }}
                    value={failureCode}
                    onChange={(e) => setFailureCode(e.target.value)}
                  >
                    {COMMON_FAILURE_CODES.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.code} — {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Row 2, Col 1: Acquiring Gateway */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="sim-gateway" style={{ display: "block", marginBottom: "0.4rem" }}>
                    Acquiring Gateway
                  </label>
                  <select
                    id="sim-gateway"
                    className="form-input"
                    style={{ width: "100%" }}
                    value={gateway}
                    onChange={(e) => setGateway(e.target.value)}
                  >
                    <option value="GATEWAY_A">Gateway A (Primary PSP)</option>
                    <option value="GATEWAY_B">Gateway B (Secondary Route)</option>
                    <option value="GATEWAY_C">Gateway C (Fallback Network)</option>
                  </select>
                </div>

                {/* Row 2, Col 2: Gateway Health Slider */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <label className="form-label" htmlFor="sim-gateway-health" style={{ margin: 0 }}>
                      Gateway Health
                    </label>
                    <span className="mono font-bold" style={{ fontSize: "0.75rem", color: gatewayHealth < 0.5 ? "var(--rose)" : "var(--emerald)" }}>
                      {(gatewayHealth * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    id="sim-gateway-health"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={gatewayHealth}
                    onChange={(e) => setGatewayHealth(parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: gatewayHealth < 0.5 ? "var(--rose)" : "var(--emerald)" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    <span>0% Degraded</span>
                    <span>100% Healthy</span>
                  </div>
                </div>
              </div>

              {/* Customer Profile Attributes */}
              <div style={{ background: "var(--bg-surface-elevated)", padding: "1rem 1.25rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.6875rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                    Customer Profile Context
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      type="checkbox"
                      id="sim-recurring"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      style={{ accentColor: "var(--indigo)" }}
                    />
                    <label htmlFor="sim-recurring" style={{ fontSize: "0.75rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                      Recurring Subscription Mandate (High LTV context)
                    </label>
                  </div>
                </div>

                <div className="sim-customer-grid">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.75rem", fontWeight: 600 }}>
                      Tenure (Days)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input mono"
                      style={{ width: "100%", fontSize: "0.8125rem", padding: "0.4rem 0.6rem" }}
                      value={customerTenure}
                      onChange={(e) => setCustomerTenure(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.75rem", fontWeight: 600 }}>
                      Attempts
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="form-input mono"
                      style={{ width: "100%", fontSize: "0.8125rem", padding: "0.4rem 0.6rem" }}
                      value={previousAttempts}
                      onChange={(e) => setPreviousAttempts(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.75rem", fontWeight: 600 }}>
                      Past Successes
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input mono"
                      style={{ width: "100%", fontSize: "0.8125rem", padding: "0.4rem 0.6rem" }}
                      value={previousSuccesses}
                      onChange={(e) => setPreviousSuccesses(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.75rem", fontWeight: 600 }}>
                      Past Failures
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input mono"
                      style={{ width: "100%", fontSize: "0.8125rem", padding: "0.4rem 0.6rem" }}
                      value={previousFailures}
                      onChange={(e) => setPreviousFailures(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Row */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ padding: "0.75rem 2rem", fontSize: "0.875rem", fontWeight: 600 }}
                >
                  {loading ? (
                    "Evaluating via Real Python Engine..."
                  ) : (
                    <>
                      <Play size={14} /> Run Live Decision Pipeline
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="alert alert-rose" style={{ padding: "0.5rem 0.75rem", fontSize: "0.75rem" }}>
                  <AlertTriangle size={14} />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Box 2: Live Decision Results (Directly Below, Full Width!) */}
        <div className="card scroll-reveal delay-2" style={{ marginBottom: 0 }}>
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <Shield size={16} className="indigo" />
                  Engine Decision Output
                </h3>
                <p className="card-subtitle">
                  Real deterministic policy gates + S-Learner probabilistic evaluation
                </p>
              </div>
              {decisionResult && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
                  onClick={() => onNavigate("decision-replay", decisionResult.case_id)}
                >
                  Forensic Replay <ArrowRight size={12} />
                </button>
              )}
            </div>

            {decisionResult ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {/* Selected Action Hero */}
                <div
                  style={{
                    background: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    padding: "1rem 1.25rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "0.6875rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-muted)" }}>
                        Autonomously Selected Action
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                        <span
                          className={`badge ${
                            decisionResult.selected_action === "CUSTOMER_RESOLUTION"
                              ? "badge-cyan"
                              : decisionResult.selected_action === "INFRASTRUCTURE_RECOVERY" || decisionResult.selected_action === "SILENT_RETRY"
                              ? "badge-emerald"
                              : decisionResult.selected_action === "WAIT"
                              ? "badge-amber"
                              : "badge-rose"
                          }`}
                          style={{ fontSize: "0.875rem", padding: "0.3rem 0.6rem" }}
                        >
                          {decisionResult.selected_action}
                        </span>
                        <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                          Case ID: <code className="mono">{decisionResult.case_id}</code>
                        </span>
                      </div>
                    </div>
                    <span className="badge badge-indigo">{decisionResult.failure_category}</span>
                  </div>

                  <p style={{ fontSize: "0.8125rem", color: "var(--text-primary)", marginTop: "0.75rem", marginBottom: 0, lineHeight: 1.5 }}>
                    <strong>Reasoning:</strong> {decisionResult.selection_reason}
                  </p>
                </div>

                {/* Policy Gates Status */}
                <div>
                  <h4 style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                    Policy Gate Verification
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    <div style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "var(--radius-sm)", padding: "0.6rem 0.75rem" }}>
                      <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--emerald)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <CheckCircle2 size={12} /> Permitted Interventions
                      </span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.35rem" }}>
                        {decisionResult.available_actions.map((act: string) => (
                          <span key={act} className="badge badge-emerald" style={{ fontSize: "0.6875rem" }}>
                            {act}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ background: "rgba(244, 63, 94, 0.05)", border: "1px solid rgba(244, 63, 94, 0.2)", borderRadius: "var(--radius-sm)", padding: "0.6rem 0.75rem" }}>
                      <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--rose)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <AlertTriangle size={12} /> Blocked Policy Constraints
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.35rem" }}>
                        {Object.keys(decisionResult.blocked_actions).length === 0 ? (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>None blocked by policy</span>
                        ) : (
                          Object.entries(decisionResult.blocked_actions).map(([act, reason]: [string, any]) => (
                            <div key={act} style={{ fontSize: "0.6875rem" }}>
                              <span style={{ color: "var(--rose)", fontWeight: 600 }}>{act}</span>:{" "}
                              <span style={{ color: "var(--text-secondary)" }}>{String(reason)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real ML Evaluations Matrix */}
                <div>
                  <h4 style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                    Action-Conditioned Probabilities &amp; Net Incremental Recovery (NIR)
                  </h4>
                  {decisionResult.evaluations.length === 0 ? (
                    <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", padding: "0.5rem" }}>
                      No candidate actions were evaluated (e.g. policy halted or unrecoverable).
                    </div>
                  ) : (
                    <div className="comparison-table-container">
                      <table className="operations-table" style={{ fontSize: "0.75rem" }}>
                        <thead>
                          <tr>
                            <th>Action</th>
                            <th>P(Rec)</th>
                            <th>ΔP (Uplift)</th>
                            <th>Cost</th>
                            <th>Calculated NIR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {decisionResult.evaluations.map((ev: ActionEvaluation) => {
                            const isSelected = ev.action === decisionResult.selected_action;
                            return (
                              <tr
                                key={ev.action}
                                style={{
                                  background: isSelected ? "rgba(99, 102, 241, 0.08)" : undefined,
                                  fontWeight: isSelected ? 600 : 400,
                                }}
                              >
                                <td>
                                  <span
                                    className={`badge ${
                                      ev.action === decisionResult.selected_action
                                        ? "badge-indigo"
                                        : "badge-muted"
                                    }`}
                                  >
                                    {ev.action} {isSelected && "★"}
                                  </span>
                                </td>
                                <td className="mono">{formatPercent(ev.predicted_recovery_probability)}</td>
                                <td className="mono" style={{ color: ev.delta_p > 0 ? "var(--emerald)" : "var(--text-muted)" }}>
                                  {ev.delta_p > 0 ? `+${(ev.delta_p * 100).toFixed(1)}%` : `${(ev.delta_p * 100).toFixed(1)}%`}
                                </td>
                                <td className="mono">{formatINR(ev.intervention_cost)}</td>
                                <td
                                  className="mono font-bold"
                                  style={{ color: ev.nir > 0 ? "var(--emerald)" : "var(--rose)" }}
                                >
                                  {formatINR(ev.nir)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: "3rem 1.5rem" }}>
                <Sliders size={32} className="muted" />
                <p style={{ marginTop: "0.5rem", color: "var(--text-secondary)" }}>
                  Select transaction attributes on the left and click <strong>Run Live Decision Pipeline</strong>.
                </p>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Results will be generated by the real backend Python engine.
                </span>
              </div>
            )}
          </div>

          {/* Transparent Roadmap Note */}
          <div
            style={{
              background: "var(--bg-surface-elevated)",
              border: "1px dashed var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "0.875rem 1rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
            }}
          >
            <Clock size={16} className="amber" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
              <strong style={{ color: "var(--text-primary)" }}>Multi-Day Stochastic Simulation (Backend Roadmap):</strong>{" "}
              In accordance with our architectural standards, hypothetical multi-day trajectory simulations across alternative stochastic gateway recovery paths will be added once a dedicated dry-run simulation endpoint is available. Currently, complete Monte Carlo baseline comparisons can be run under <strong>Benchmark Lab</strong>.
            </div>
          </div>
        </div>
      </div>
    );
  };
