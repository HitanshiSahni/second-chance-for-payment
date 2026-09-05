import React, { useState } from "react";
import {
  ShieldCheck,
  Cpu,
  GitBranch,
  Layers,
  ArrowRight,
  Lock,
  DollarSign,
  Activity,
} from "lucide-react";
import type { NavRoute } from "../components/Sidebar";

interface ArchitecturePageProps {
  onNavigate: (route: NavRoute, caseId?: string) => void;
}

export const ArchitecturePage: React.FC<ArchitecturePageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<"tiers" | "math" | "fsm" | "policies">("tiers");

  return (
    <div className="architecture-page">
      {/* Header Banner */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span className="badge badge-indigo">
                <ShieldCheck size={12} /> System Specification
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Deterministic Safeguards &amp; Economically Bounded ML
              </span>
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
              RecoveryOS Architectural Boundaries
            </h2>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", maxWidth: "750px", marginTop: "0.35rem", lineHeight: 1.5 }}>
              RecoveryOS separates deterministic policy enforcement, probabilistic ML uplift estimation, and stateful lifecycle execution into three decoupled, auditable layers.
              Machine learning models never override hard business or regulatory constraints.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigate("decision-replay")}
          >
            Inspect in Decision Replay <ArrowRight size={13} />
          </button>
        </div>

        {/* Workspace Navigation Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
          {[
            { id: "tiers", label: "Three-Tier Boundary Architecture", icon: <Layers size={14} /> },
            { id: "math", label: "NIR Formulation & ML S-Learner", icon: <DollarSign size={14} /> },
            { id: "fsm", label: "Finite State Machine (FSM) Lifecycle", icon: <GitBranch size={14} /> },
            { id: "policies", label: "Deterministic Policy Catalog", icon: <Lock size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`btn ${activeTab === tab.id ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem", gap: "0.4rem" }}
              onClick={() => setActiveTab(tab.id as any)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Three-Tier Boundary Architecture */}
      {activeTab === "tiers" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
            {/* Tier 1 */}
            <div className="card" style={{ marginBottom: 0, borderColor: "rgba(244, 63, 94, 0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <span style={{ padding: "0.35rem", borderRadius: "var(--radius-sm)", background: "rgba(244, 63, 94, 0.1)", color: "var(--rose)" }}>
                  <Lock size={16} />
                </span>
                <div>
                  <h4 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#fff", margin: 0 }}>Tier 1: Policy Engine</h4>
                  <span style={{ fontSize: "0.6875rem", color: "var(--rose)" }}>Deterministic Non-Bypassable Gates</span>
                </div>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Evaluates transactions against strict business and security rules before any probabilistic model is consulted.
              </p>
              <ul style={{ fontSize: "0.75rem", color: "var(--text-muted)", paddingLeft: "1.1rem", marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <li>Hard stop on fraud suspicion (<code>FRAUD_SUSPECTED</code>)</li>
                <li>Max retry cap enforcement (&le; 3 attempts)</li>
                <li>Mandatory cooldown backoff between retries</li>
                <li>Customer communication fatigue caps</li>
              </ul>
              <div style={{ marginTop: "1rem", padding: "0.5rem", background: "var(--bg-surface-elevated)", borderRadius: "var(--radius-sm)", fontSize: "0.6875rem", color: "var(--text-secondary)" }}>
                <strong>Key Invariant:</strong> If an action is blocked by Tier 1, it is physically impossible for the ML layer to select it.
              </div>
            </div>

            {/* Tier 2 */}
            <div className="card" style={{ marginBottom: 0, borderColor: "rgba(99, 102, 241, 0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <span style={{ padding: "0.35rem", borderRadius: "var(--radius-sm)", background: "rgba(99, 102, 241, 0.1)", color: "var(--indigo)" }}>
                  <Cpu size={16} />
                </span>
                <div>
                  <h4 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#fff", margin: 0 }}>Tier 2: Probabilistic ML</h4>
                  <span style={{ fontSize: "0.6875rem", color: "var(--indigo)" }}>Action-Conditioned S-Learner</span>
                </div>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Estimates recovery probability conditioned on payment context and candidate action: <br />
                <code className="mono">P(rec | X, action)</code>.
              </p>
              <ul style={{ fontSize: "0.75rem", color: "var(--text-muted)", paddingLeft: "1.1rem", marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <li>Estimates counterfactual uplift (&Delta;P vs WAIT baseline)</li>
                <li>Ranks candidate actions by Net Incremental Recovery (NIR)</li>
                <li>Applies positive NIR thresholding (NIR &gt; 0)</li>
                <li>Zero-hallucination, bounded economic utility</li>
              </ul>
              <div style={{ marginTop: "1rem", padding: "0.5rem", background: "var(--bg-surface-elevated)", borderRadius: "var(--radius-sm)", fontSize: "0.6875rem", color: "var(--text-secondary)" }}>
                <strong>Key Invariant:</strong> If all valid interventions produce negative NIR, the system gracefully defaults to WAIT.
              </div>
            </div>

            {/* Tier 3 */}
            <div className="card" style={{ marginBottom: 0, borderColor: "rgba(16, 185, 129, 0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <span style={{ padding: "0.35rem", borderRadius: "var(--radius-sm)", background: "rgba(16, 185, 129, 0.1)", color: "var(--emerald)" }}>
                  <GitBranch size={16} />
                </span>
                <div>
                  <h4 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#fff", margin: 0 }}>Tier 3: Execution &amp; FSM</h4>
                  <span style={{ fontSize: "0.6875rem", color: "var(--emerald)" }}>Strict Acyclic State Transition</span>
                </div>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Dispatches selected actions, verifies outcomes via gateway webhooks, and manages conditional re-evaluation loops.
              </p>
              <ul style={{ fontSize: "0.75rem", color: "var(--text-muted)", paddingLeft: "1.1rem", marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <li>Strict transition graph enforced by state machine</li>
                <li>Cryptographic-style immutable audit ledger</li>
                <li>Conditional re-evaluation unblocking on health change</li>
                <li>Zero execution loops or uncontrolled recursion</li>
              </ul>
              <div style={{ marginTop: "1rem", padding: "0.5rem", background: "var(--bg-surface-elevated)", borderRadius: "var(--radius-sm)", fontSize: "0.6875rem", color: "var(--text-secondary)" }}>
                <strong>Key Invariant:</strong> Every state change is recorded with an immutable timestamp, prior state, new state, and JSON metadata.
              </div>
            </div>
          </div>

          {/* Data Flow Diagram Card */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: "1rem" }}>
              <Activity size={16} className="cyan" />
              End-to-End Decision &amp; Execution Pipeline
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: "0.75rem",
                alignItems: "center",
              }}
            >
              {[
                { step: "1", title: "Payment Failure", desc: "Webhook ingested from PSP gateway", tag: "Ingestion" },
                { step: "2", title: "Deterministic Filter", desc: "Policy rules check fraud & retry limits", tag: "Tier 1: Guardrail" },
                { step: "3", title: "S-Learner Inference", desc: "Action-conditioned P(rec) computed", tag: "Tier 2: ML Model" },
                { step: "4", title: "NIR Maximization", desc: "Net Incremental Recovery ranked", tag: "Tier 2: Utility" },
                { step: "5", title: "FSM Dispatch", desc: "Action executed via targeted gateway", tag: "Tier 3: Execution" },
                { step: "6", title: "Audit & Terminal", desc: "Immutable event committed to ledger", tag: "Ledger" },
              ].map((item) => (
                <div
                  key={item.step}
                  style={{
                    background: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0.85rem",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                    <span className="mono font-bold" style={{ color: "var(--cyan)", fontSize: "0.75rem" }}>
                      STEP {item.step}
                    </span>
                    <span className="badge badge-muted" style={{ fontSize: "0.625rem" }}>
                      {item.tag}
                    </span>
                  </div>
                  <h4 style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#fff", margin: "0 0 0.25rem 0" }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: NIR Formulation & ML S-Learner */}
      {activeTab === "math" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: "0.5rem" }}>
              <DollarSign size={16} className="emerald" />
              Net Incremental Recovery (NIR) Mathematical Objective
            </h3>
            <p className="card-subtitle" style={{ marginBottom: "1.25rem" }}>
              How RecoveryOS balances recovered revenue against intervention costs and customer friction
            </p>

            <div
              style={{
                background: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "1.25rem",
                fontFamily: "var(--font-mono)",
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--emerald)", marginBottom: "0.5rem" }}>
                NIR(a) = &Delta;P(a) &times; V - C(a)
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                where: <br />
                &bull; <strong style={{ color: "#fff" }}>V</strong> = Transaction Value (INR) <br />
                &bull; <strong style={{ color: "#fff" }}>&Delta;P(a)</strong> = P&#770;(Recovery | Context, a) - P&#770;(Recovery | Context, WAIT) <br />
                &bull; <strong style={{ color: "#fff" }}>C(a)</strong> = Total intervention cost (API cost + customer friction weight)
              </div>
            </div>

            <h4 style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#fff", marginBottom: "0.5rem" }}>
              Action Selection Policy:
            </h4>
            <div
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                padding: "0.85rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                fontSize: "0.75rem",
                fontFamily: "var(--font-mono)",
                lineHeight: 1.6,
                color: "var(--text-primary)",
              }}
            >
              a* = argmax&#123; NIR(a) &#125; for all a &isin; AvailableActions <br />
              subject to: NIR(a*) &gt; 0 <br />
              fallback: if max&#123; NIR(a) &#125; &le; 0 &rarr; a* = WAIT
            </div>

            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "1rem", lineHeight: 1.5 }}>
              This guarantees that the system <strong>never takes an action that costs more than the expected revenue gain</strong>.
              Unlike naive blind retries that run up unnecessary gateway costs and trigger customer churn, RecoveryOS acts only when economically justified.
            </p>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: "0.5rem" }}>
              <Cpu size={16} className="indigo" />
              Intervention Cost Matrix
            </h3>
            <p className="card-subtitle" style={{ marginBottom: "1rem" }}>
              Configured costs per intervention type
            </p>

            <table className="operations-table" style={{ fontSize: "0.75rem" }}>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Direct Cost</th>
                  <th>Friction Weight</th>
                  <th>Target Archetype</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="badge badge-emerald">INFRASTRUCTURE_RECOVERY</span></td>
                  <td className="mono">₹2.00</td>
                  <td>Low</td>
                  <td>Gateway timeouts, connection drops</td>
                </tr>
                <tr>
                  <td><span className="badge badge-emerald">SILENT_RETRY</span></td>
                  <td className="mono">₹5.00</td>
                  <td>None</td>
                  <td>Soft processor declines, temporary load</td>
                </tr>
                <tr>
                  <td><span className="badge badge-cyan">CUSTOMER_RESOLUTION</span></td>
                  <td className="mono">₹15.00</td>
                  <td>Medium</td>
                  <td>Expired cards, 3DS authentication drops</td>
                </tr>
                <tr>
                  <td><span className="badge badge-amber">WAIT</span></td>
                  <td className="mono">₹0.00</td>
                  <td>Zero</td>
                  <td>Negative NIR, degraded gateway recovery</td>
                </tr>
                <tr>
                  <td><span className="badge badge-rose">HALT</span></td>
                  <td className="mono">₹0.00</td>
                  <td>Zero</td>
                  <td>Fraud suspicion, hard unrecoverable cards</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Finite State Machine (FSM) Lifecycle */}
      {activeTab === "fsm" && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "0.5rem" }}>
            <GitBranch size={16} className="cyan" />
            Strictly Acyclic Finite State Machine
          </h3>
          <p className="card-subtitle" style={{ marginBottom: "1.25rem" }}>
            Valid states and verified deterministic transitions
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {[
              { state: "PAYMENT_FAILED", type: "Initial", color: "badge-muted", desc: "Webhook received" },
              { state: "PROFILING", type: "Intermediate", color: "badge-indigo", desc: "Context loaded" },
              { state: "POLICY_CHECKED", type: "Gate", color: "badge-indigo", desc: "Hard rules evaluated" },
              { state: "ACTION_EVALUATED", type: "Decision", color: "badge-indigo", desc: "S-Learner NIR ranked" },
              { state: "EXECUTING", type: "Dispatch", color: "badge-cyan", desc: "Intervention in flight" },
            ].map((s) => (
              <div
                key={s.state}
                style={{
                  background: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.85rem",
                }}
              >
                <span className={`badge ${s.color}`} style={{ fontSize: "0.625rem", marginBottom: "0.35rem" }}>
                  {s.type}
                </span>
                <div className="mono font-bold" style={{ fontSize: "0.75rem", color: "#fff" }}>
                  {s.state}
                </div>
                <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  {s.desc}
                </div>
              </div>
            ))}
          </div>

          <h4 style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#fff", marginBottom: "0.75rem" }}>
            Terminal &amp; Loop States:
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
            <div style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "var(--radius-sm)", padding: "0.85rem" }}>
              <span className="badge badge-emerald" style={{ fontSize: "0.625rem" }}>Terminal State</span>
              <div className="mono font-bold" style={{ fontSize: "0.8125rem", color: "var(--emerald)", marginTop: "0.35rem" }}>
                RECOVERED
              </div>
              <p style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", marginTop: "0.25rem", marginBottom: 0 }}>
                Payment successfully captured on retry or customer update. Case closed.
              </p>
            </div>

            <div style={{ background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "var(--radius-sm)", padding: "0.85rem" }}>
              <span className="badge badge-amber" style={{ fontSize: "0.625rem" }}>Conditional State</span>
              <div className="mono font-bold" style={{ fontSize: "0.8125rem", color: "var(--amber)", marginTop: "0.35rem" }}>
                RE_EVALUATE
              </div>
              <p style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", marginTop: "0.25rem", marginBottom: 0 }}>
                Awaiting health score recovery or backoff timer completion before second attempt.
              </p>
            </div>

            <div style={{ background: "rgba(244, 63, 94, 0.05)", border: "1px solid rgba(244, 63, 94, 0.2)", borderRadius: "var(--radius-sm)", padding: "0.85rem" }}>
              <span className="badge badge-rose" style={{ fontSize: "0.625rem" }}>Terminal State</span>
              <div className="mono font-bold" style={{ fontSize: "0.8125rem", color: "var(--rose)", marginTop: "0.35rem" }}>
                HALTED
              </div>
              <p style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", marginTop: "0.25rem", marginBottom: 0 }}>
                Blocked by deterministic security policy (e.g. Fraud, Stolen Card).
              </p>
            </div>

            <div style={{ background: "rgba(100, 116, 139, 0.05)", border: "1px solid rgba(100, 116, 139, 0.2)", borderRadius: "var(--radius-sm)", padding: "0.85rem" }}>
              <span className="badge badge-muted" style={{ fontSize: "0.625rem" }}>Terminal State</span>
              <div className="mono font-bold" style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                UNRECOVERABLE
              </div>
              <p style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", marginTop: "0.25rem", marginBottom: 0 }}>
                Exceeded retry cap or expired card without customer update.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Deterministic Policy Catalog */}
      {activeTab === "policies" && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "0.5rem" }}>
            <Lock size={16} className="rose" />
            Configured Policy Constraints (`config/policy.yaml`)
          </h3>
          <p className="card-subtitle" style={{ marginBottom: "1.25rem" }}>
            Deterministic rules actively enforced across every single transaction
          </p>

          <table className="operations-table" style={{ fontSize: "0.75rem" }}>
            <thead>
              <tr>
                <th>Rule Name</th>
                <th>Trigger Condition</th>
                <th>Enforced Action</th>
                <th>Policy Rationale</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono font-bold">FRAUD_DETECTION_HALT</td>
                <td><code>failure_code == 'FRAUD_SUSPECTED'</code></td>
                <td><span className="badge badge-rose">HALT (Immediate)</span></td>
                <td>Zero-tolerance security; prevent merchant fines and card network penalties</td>
              </tr>
              <tr>
                <td className="mono font-bold">MAX_RETRY_CAP</td>
                <td><code>previous_attempts &gt;= 3</code></td>
                <td><span className="badge badge-rose">Block Retries &rarr; UNRECOVERABLE</span></td>
                <td>Mitigates card network excessive retry fees (Visa/Mastercard mandates)</td>
              </tr>
              <tr>
                <td className="mono font-bold">GATEWAY_OUTAGE_COOLDOWN</td>
                <td><code>gateway_health_score &lt; 0.50</code></td>
                <td><span className="badge badge-amber">Block Immediate &rarr; WAIT</span></td>
                <td>Prevents sending retry traffic into a degraded or failing payment processor</td>
              </tr>
              <tr>
                <td className="mono font-bold">EXPIRATION_CUSTOMER_MANDATE</td>
                <td><code>failure_code == 'EXPIRED_CARD'</code></td>
                <td><span className="badge badge-cyan">Require CUSTOMER_RESOLUTION</span></td>
                <td>Silent retries on expired cards are 100% destined to fail</td>
              </tr>
              <tr>
                <td className="mono font-bold">FATIGUE_COOLDOWN_LIMIT</td>
                <td>Customer contacted within last 24 hours</td>
                <td><span className="badge badge-amber">Suppress Outbound Message</span></td>
                <td>Prevents spamming customers and damaging merchant brand reputation</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
