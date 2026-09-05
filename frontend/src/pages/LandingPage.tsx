import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  ShieldCheck,
  Brain,
  GitBranch,
  DollarSign,
  Activity,
  Search,
  Zap,
  Target,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Code2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { ScrollCinematicBackground } from "../components/ScrollCinematicBackground";

interface LandingPageProps {
  onEnterDashboard: () => void;
}

interface PipelineStepData {
  id: string;
  stepNumber: string;
  title: string;
  shortDesc: string;
  category: string;
  icon: React.ElementType;
  accentColor: string;
  badgeColorClass: "blue" | "cyan" | "rose" | "purple" | "gold" | "green";
  latency: string;
  headline: string;
  description: string;
  formulaOrRule: string;
  guarantees: string[];
  samplePayload: Record<string, any>;
  filename: string;
}

const PIPELINE_STEPS: PipelineStepData[] = [
  {
    id: "ingest",
    stepNumber: "01",
    title: "Payment Fails",
    shortDesc: "Gateway Webhook",
    category: "INGESTION & TELEMETRY",
    icon: Activity,
    accentColor: "#528FF0",
    badgeColorClass: "blue",
    latency: "< 3ms ingestion",
    headline: "Real-time gateway webhook capture & signal extraction",
    description:
      "Captures incoming payment failure events from payment gateways, card networks, and UPI switches. Extracts raw gateway error codes, card BIN, customer archetype, failure timestamp, and bank response headers.",
    formulaOrRule: "Event Vector: x = [mcc, amount, bank_id, error_code, retry_count, network, archetype]",
    guarantees: [
      "Sub-5ms ingestion SLA",
      "Idempotent event deduplication",
      "Context signal vectorization",
    ],
    filename: "event.webhook.json",
    samplePayload: {
      event: "payment.failed",
      case_id: "case_live_894120",
      amount: 4250.0,
      currency: "INR",
      error_code: "GATEWAY_TIMEOUT",
      bank: "HDFC_BANK",
      payment_method: "UPI",
      customer_archetype: "REPEAT_BUYER",
      timestamp: "2026-09-05T16:50:00Z",
    },
  },
  {
    id: "profile",
    stepNumber: "02",
    title: "Failure Profiling",
    shortDesc: "Root Cause Taxonomy",
    category: "TAXONOMY CLASSIFIER",
    icon: Search,
    accentColor: "#2D9CDB",
    badgeColorClass: "cyan",
    latency: "< 2ms diagnosis",
    headline: "Deterministic root cause taxonomy & issuer health indexing",
    description:
      "Maps raw gateway failure strings to a structured 9-class failure taxonomy. Distinguishes transient infrastructure glitches from terminal customer rejections while aggregating real-time issuer health degradation.",
    formulaOrRule: "Health Index: H_issuer(t) = Successes / Total over rolling 5m window",
    guarantees: [
      "9-class failure taxonomy",
      "Real-time bank health score",
      "Transient vs fatal classification",
    ],
    filename: "taxonomy.profile.json",
    samplePayload: {
      failure_profile: "ISSUER_TIMEOUT",
      category: "INFRASTRUCTURE_TRANSIENT",
      is_retryable: true,
      issuer_health_score: 0.38,
      recommended_wait_sec: 180,
      requires_customer_action: false,
    },
  },
  {
    id: "policy",
    stepNumber: "03",
    title: "Policy Gate",
    shortDesc: "Compliance Check",
    category: "DETERMINISTIC COMPLIANCE",
    icon: ShieldCheck,
    accentColor: "#f43f5e",
    badgeColorClass: "rose",
    latency: "< 1ms rule check",
    headline: "Deterministic compliance rules ML is never permitted to override",
    description:
      "Enforces hard safety boundaries before any machine learning is invoked. Hard declines (fraud, stolen card) are immediately halted. Enforces maximum 3 retry limits, customer contact cooldowns, and a strict 24-hour recovery SLA.",
    formulaOrRule: "Policy Gate: FraudFlag = 0 ∧ Retries < 3 ∧ ElapsedTime < 24h ∧ CooldownExpired = true",
    guarantees: [
      "Hard fraud blocking",
      "Max 3 retries enforced",
      "24-hour recovery window",
    ],
    filename: "policy.gate.json",
    samplePayload: {
      policy_verdict: "PASSED",
      active_checks: {
        fraud_risk_score: 0.12,
        current_retry_count: 1,
        max_retries_allowed: 3,
        sla_window_active: true,
      },
      filtered_candidate_actions: [
        "SILENT_RETRY",
        "SMART_ROUTING",
        "CUSTOMER_RESOLUTION",
      ],
    },
  },
  {
    id: "ml",
    stepNumber: "04",
    title: "ML Scoring",
    shortDesc: "Action-Conditioned P(rec)",
    category: "S-LEARNER PROBABILITY",
    icon: Brain,
    accentColor: "#a855f7",
    badgeColorClass: "purple",
    latency: "< 8ms inference",
    headline: "Action-conditioned counterfactual probability estimation",
    description:
      "Our trained S-Learner classifier evaluates each policy-eligible candidate action conditioned on transaction context, merchant segment, and current bank health to compute individual recovery probabilities P(recovery | context, action).",
    formulaOrRule: "ΔP(a) = P(recovery | context, action) - P(recovery | context, WAIT)",
    guarantees: [
      "Calibrated probabilities",
      "Counterfactual uplift estimation",
      "Conditioned on bank health",
    ],
    filename: "ml.inference.json",
    samplePayload: {
      model: "S-Learner (GradientBoostingCalibrated)",
      feature_count: 17,
      candidate_probabilities: {
        SMART_ROUTING: 0.842,
        SILENT_RETRY: 0.695,
        CUSTOMER_RESOLUTION: 0.51,
        WAIT: 0.115,
      },
    },
  },
  {
    id: "nir",
    stepNumber: "05",
    title: "NIR Ranking",
    shortDesc: "ΔP × Amount − Cost",
    category: "ECONOMIC OPTIMIZER",
    icon: DollarSign,
    accentColor: "#F5A623",
    badgeColorClass: "gold",
    latency: "< 1ms ROI rank",
    headline: "Net Incremental Recovery economic optimization",
    description:
      "Ranks candidate interventions by true economic return rather than raw recovery probability. Interventions are penalized by their operational cost (gateway fees, WhatsApp messaging cost). Only actions with positive NIR are eligible to execute.",
    formulaOrRule: "NIR(a) = [P(a) - P(WAIT)] × TransactionAmount - Cost(a)",
    guarantees: [
      "Positive ROI required",
      "Baseline WAIT subtracted",
      "Intervention cost penalized",
    ],
    filename: "nir.ranking.json",
    samplePayload: {
      transaction_amount: 4250.0,
      baseline_P_wait: 0.115,
      evaluations: [
        { action: "SMART_ROUTING", delta_P: 0.727, cost: 12.0, nir: 3077.75 },
        { action: "SILENT_RETRY", delta_P: 0.58, cost: 3.0, nir: 2462.0 },
        { action: "CUSTOMER_RESOLUTION", delta_P: 0.395, cost: 1.5, nir: 1677.25 },
      ],
      winning_action: "SMART_ROUTING",
    },
  },
  {
    id: "action",
    stepNumber: "06",
    title: "Optimal Action",
    shortDesc: "Execute + Audit",
    category: "FSM & AUDIT DISPATCH",
    icon: Target,
    accentColor: "#10b981",
    badgeColorClass: "green",
    latency: "< 15ms dispatch",
    headline: "Automated intervention dispatch & immutable audit logging",
    description:
      "Executes the winning action across gateway APIs or customer communication rails. Transitions the case finite state machine into terminal or re-evaluation state and writes a cryptographic hash-chained entry to the forensic audit ledger.",
    formulaOrRule: "Transition: S_next = δ(S_current, Action) ∧ Ledger_hash = SHA256(prev_hash + entry)",
    guarantees: [
      "Finite State Machine safety",
      "Immutable cryptographic trail",
      "Bounded re-evaluation loops",
    ],
    filename: "dispatch.ledger.json",
    samplePayload: {
      action_dispatched: "SMART_ROUTING",
      secondary_switch: "HDFC_DIRECT_SWITCH",
      fsm_state_change: "EVALUATED -> DISPATCHED",
      audit_entry_id: "audit_894120_02",
      hash: "sha256:7f8a9e2b1c4d5e6f...",
      final_status: "RECOVERED",
    },
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterDashboard }) => {
  const pageRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);

  // Auto-cycle through steps if auto-playing
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % PIPELINE_STEPS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      history.replaceState(null, "", `#${id}`);
    }
  };

  // Scroll to hash target on initial load if present (e.g. #features, #pipeline, #tech)
  useEffect(() => {
    const raw = window.location.hash.replace("#", "");
    if (raw && ["features", "pipeline", "tech"].includes(raw)) {
      const timer = setTimeout(() => {
        const el = document.getElementById(raw);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 80);
      return () => clearTimeout(timer);
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  // IntersectionObserver for viewport scroll-reveal animations
  useEffect(() => {
    const container = pageRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px 80px 0px" }
    );

    const elements = container.querySelectorAll(".scroll-reveal");
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        el.classList.add("revealed");
      } else {
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, []);

  const current = PIPELINE_STEPS[activeStep];

  return (
    <div className="landing-page" ref={pageRef}>
      {/* Scroll-Driven Cinematic Animation Background */}
      <ScrollCinematicBackground />

      {/* Floating Glassmorphic Navbar */}
      <nav className="landing-nav">
        <div className="landing-nav-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <img src="/Second_Logo.png" alt="Second Logo" className="landing-nav-logo" />
          <span className="landing-nav-title">Second</span>
        </div>
        <div className="landing-nav-links">
          <button type="button" className="landing-nav-link" onClick={() => scrollToSection("pipeline")}>
            Pipeline
          </button>
          <button type="button" className="landing-nav-link" onClick={() => scrollToSection("features")}>
            Capabilities
          </button>
          <button type="button" className="landing-nav-link" onClick={() => scrollToSection("calculator")}>
            Simulator
          </button>
          <button type="button" className="landing-nav-link" onClick={() => scrollToSection("tech")}>
            Tech Stack
          </button>
          <button type="button" className="landing-nav-btn" onClick={onEnterDashboard}>
            Enter Dashboard <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* ====== HERO SECTION ====== */}
      <section className="landing-hero landing-section">
        <div className="landing-hero-logo-wrap">
          <img
            src="/Second_Logo.png"
            alt="Second Brand Mark"
            className="landing-hero-logo-img"
          />
        </div>

        <div className="landing-hero-badge">
          <Zap size={14} />
          Razorpay Buildathon · Track 03 — AI Revenue Recovery
        </div>

        <h1>
          Every Payment Deserves
          <br />
          a <span className="highlight">Second</span>
        </h1>

        <p className="landing-hero-subtitle">
          Intelligent payment failure recovery orchestrator. Diagnose failures,
          enforce compliance, estimate recovery probability, and select the
          optimal intervention — all before bothering the customer.
        </p>

        <div className="landing-hero-actions">
          <button className="landing-btn-primary" onClick={onEnterDashboard}>
            Enter Dashboard
            <ArrowRight size={18} />
          </button>
          <button
            type="button"
            className="landing-btn-secondary"
            onClick={() => scrollToSection("features")}
          >
            How It Works
            <ChevronDown size={18} />
          </button>
        </div>

        <div
          className="scroll-indicator"
          onClick={() => scrollToSection("pipeline")}
          style={{ cursor: "pointer" }}
        >
          <ChevronDown size={18} />
          <span>Scroll to explore</span>
        </div>
      </section>

      {/* ====== PIPELINE SECTION ====== */}
      <section className="landing-pipeline landing-section" id="pipeline">
        <div className="scroll-reveal">
          <div className="pipeline-header-badge">
            <Sparkles size={14} />
            Interactive Architecture Flow
          </div>
          <h2>The Recovery Pipeline</h2>
          <p className="landing-pipeline-subtitle">
            From failure detection to intelligent recovery — every step audited, explainable, and bounded.
            Click any step to inspect live telemetry and decision logic.
          </p>
        </div>

        {/* 6-Stage Balanced Sequence Grid */}
        <div className="pipeline-grid scroll-reveal delay-1">
          {PIPELINE_STEPS.map((step, idx) => {
            const isCurrent = idx === activeStep;
            const IconComponent = step.icon;
            return (
              <div
                key={step.id}
                className={`pipeline-card ${isCurrent ? "active" : ""}`}
                onClick={() => {
                  setActiveStep(idx);
                  setIsAutoPlaying(false);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setActiveStep(idx);
                    setIsAutoPlaying(false);
                  }
                }}
              >
                <div className="pipeline-card-top">
                  <span className="pipeline-card-num">{step.stepNumber}</span>
                  <span
                    className={`pipeline-card-dot ${step.badgeColorClass} ${
                      isCurrent ? "pulse" : ""
                    }`}
                  />
                </div>

                <div className={`pipeline-card-icon ${step.badgeColorClass}`}>
                  <IconComponent size={20} />
                </div>

                <div className="pipeline-card-meta">
                  <h4 className="pipeline-card-title">{step.title}</h4>
                  <span className="pipeline-card-desc">{step.shortDesc}</span>
                </div>

                {isCurrent && (
                  <div
                    className="pipeline-card-glow-bar"
                    style={{ background: step.accentColor }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Live Inspector Console */}
        <div className="pipeline-inspector scroll-reveal delay-2">
          <div className="pipeline-inspector-header">
            <div className="inspector-header-left">
              <span className="inspector-step-tag">STEP {current.stepNumber}</span>
              <span className={`inspector-category-badge ${current.badgeColorClass}`}>
                {current.category}
              </span>
              <span className="inspector-latency-pill">{current.latency}</span>
            </div>

            <div className="inspector-header-controls">
              <button
                className="inspector-nav-btn"
                onClick={() => {
                  setActiveStep((prev) =>
                    prev > 0 ? prev - 1 : PIPELINE_STEPS.length - 1
                  );
                  setIsAutoPlaying(false);
                }}
                title="Previous Step"
                type="button"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                className={`inspector-play-btn ${isAutoPlaying ? "active" : ""}`}
                onClick={() => setIsAutoPlaying((prev) => !prev)}
                title={isAutoPlaying ? "Pause auto-cycle" : "Auto-cycle steps"}
                type="button"
              >
                {isAutoPlaying ? <Pause size={14} /> : <Play size={14} />}
                <span>{isAutoPlaying ? "Auto-Play ON" : "Auto-Play"}</span>
              </button>

              <button
                className="inspector-nav-btn"
                onClick={() => {
                  setActiveStep((prev) =>
                    prev < PIPELINE_STEPS.length - 1 ? prev + 1 : 0
                  );
                  setIsAutoPlaying(false);
                }}
                title="Next Step"
                type="button"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="pipeline-inspector-body">
            {/* Left Column: Operational Mechanics */}
            <div className="inspector-col-left">
              <h3 className="inspector-headline">{current.headline}</h3>
              <p className="inspector-desc">{current.description}</p>

              <div className="inspector-formula-box">
                <div className="formula-label">CORE LOGIC & FORMULATION</div>
                <code className="formula-code">{current.formulaOrRule}</code>
              </div>

              <div className="inspector-guarantees">
                {current.guarantees.map((item, i) => (
                  <div key={i} className="guarantee-chip">
                    <CheckCircle2 size={13} style={{ color: current.accentColor }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Live Telemetry Payload */}
            <div className="inspector-col-right">
              <div className="telemetry-terminal">
                <div className="terminal-header">
                  <div className="terminal-dots">
                    <span className="dot dot-red" />
                    <span className="dot dot-yellow" />
                    <span className="dot dot-green" />
                  </div>
                  <div className="terminal-filename">
                    <Code2 size={13} />
                    <span>{current.filename}</span>
                  </div>
                  <span className="terminal-badge">LIVE TRACE</span>
                </div>
                <pre className="terminal-code">
                  <code>{JSON.stringify(current.samplePayload, null, 2)}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== FEATURES SECTION ====== */}
      <section className="landing-features landing-section" id="features">
        <div className="scroll-reveal">
          <h2>Why Second Wins</h2>
          <p className="landing-features-subtitle">
            Not just retry logic. An intelligent, auditable, economically-bounded recovery system.
          </p>
        </div>

        <div className="feature-grid">
          <div className="feature-card scroll-reveal delay-1">
            <div className="feature-icon blue"><ShieldCheck size={22} /></div>
            <h3>Deterministic Policy Gate</h3>
            <p>
              Hard compliance rules that ML can never override. Fraud blocks,
              retry limits, cooldowns, and recovery windows — all config-driven.
            </p>
          </div>

          <div className="feature-card scroll-reveal delay-2">
            <div className="feature-icon green"><Brain size={22} /></div>
            <h3>Action-Conditioned ML</h3>
            <p>
              S-Learner estimates P(recovery | context, action) per candidate.
              Counterfactual ΔP comparison against the no-intervention baseline.
            </p>
          </div>

          <div className="feature-card scroll-reveal delay-3">
            <div className="feature-icon gold"><DollarSign size={22} /></div>
            <h3>Net Incremental Recovery</h3>
            <p>
              NIR = (ΔP × Amount) − Cost. Actions are ranked by real financial
              ROI, not just probability. Only positive-value interventions execute.
            </p>
          </div>

          <div className="feature-card scroll-reveal delay-4">
            <div className="feature-icon rose"><GitBranch size={22} /></div>
            <h3>Finite State Machine</h3>
            <p>
              Every case follows a strict lifecycle. Terminal states are
              irreversible. Re-evaluation loops are bounded. No infinite retries.
            </p>
          </div>

          <div className="feature-card scroll-reveal delay-5">
            <div className="feature-icon cyan"><Search size={22} /></div>
            <h3>Forensic Decision Replay</h3>
            <p>
              Inspect every decision made by the system. Full audit trail with
              policy reasons, ML scores, NIR matrix, and state transitions.
            </p>
          </div>

          <div className="feature-card scroll-reveal delay-6">
            <div className="feature-icon purple"><Activity size={22} /></div>
            <h3>Benchmark Validation</h3>
            <p>
              Monte Carlo evaluation engine. Run Second against a blind retry
              baseline across hundreds of synthetic transactions. Reproducible results.
            </p>
          </div>
        </div>
      </section>

      {/* ====== TECH STACK SECTION ====== */}
      <section className="landing-tech landing-section" id="tech">
        <h2 className="scroll-reveal">Built With</h2>
        <div className="tech-grid scroll-reveal delay-2">
          <div className="tech-pill"><span className="tech-dot python" /> Python 3.13</div>
          <div className="tech-pill"><span className="tech-dot fastapi" /> FastAPI</div>
          <div className="tech-pill"><span className="tech-dot react" /> React 19</div>
          <div className="tech-pill"><span className="tech-dot typescript" /> TypeScript</div>
          <div className="tech-pill"><span className="tech-dot sklearn" /> Scikit-Learn</div>
          <div className="tech-pill"><span className="tech-dot sqlite" /> SQLAlchemy + SQLite</div>
          <div className="tech-pill"><span className="tech-dot pydantic" /> Pydantic v2</div>
          <div className="tech-pill"><span className="tech-dot vite" /> Vite</div>
        </div>
      </section>

      {/* ====== CTA SECTION ====== */}
      <section className="landing-cta landing-section">
        <div className="landing-cta-box scroll-reveal">
          <h2>Ready to recover lost revenue?</h2>
          <p>
            Enter the dashboard to diagnose failed transactions, replay AI decisions,
            and benchmark recovery performance in real time.
          </p>
          <button className="landing-btn-primary" onClick={onEnterDashboard} style={{ position: "relative" }}>
            Launch Second Dashboard
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="landing-footer">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.65rem", marginBottom: "0.6rem" }}>
          <img src="/Second_Logo.png" alt="Second" style={{ width: 22, height: 22, borderRadius: 5, objectFit: "cover" }} />
          <span style={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem", letterSpacing: "-0.01em" }}>Second</span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>· AI Revenue Recovery</span>
        </div>
        <div>Built for Razorpay Buildathon · Track 03 — AI Revenue Recovery</div>
      </footer>
    </div>
  );
};
