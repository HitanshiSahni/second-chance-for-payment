import React from "react";
import { ShieldCheck, Cpu, Database } from "lucide-react";

export const SystemBoundaries: React.FC = () => {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <Cpu size={18} className="indigo" />
            Where AI Decides — and Where It Doesn't
          </h2>
          <p className="card-subtitle">
            Strategic architectural boundaries enforced to ensure compliance, safety, and financial explainability
          </p>
        </div>
      </div>

      <div className="boundary-grid">
        <div className="boundary-box">
          <div className="boundary-header deterministic">
            <ShieldCheck size={18} />
            DETERMINISTIC GATE
          </div>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
            Hard compliance constraints and stopping rules that AI/ML is mathematically forbidden from overriding:
          </p>
          <ul className="boundary-list">
            <li>Fraud, lost card, & account closure blocklists</li>
            <li>Configurable retry limits (e.g., max 3 attempts)</li>
            <li>Customer contact cooldowns (24h quiet period)</li>
            <li>Finite State Machine (FSM) transition integrity</li>
            <li>96-hour maximum case recovery window</li>
          </ul>
        </div>

        <div className="boundary-box">
          <div className="boundary-header learned">
            <Cpu size={18} />
            LEARNED / ML LAYER
          </div>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
            Statistical action-conditioned model scoring the economic value of candidate interventions:
          </p>
          <ul className="boundary-list">
            <li>S-Learner (GradientBoostingClassifier)</li>
            <li>Trained on randomized historical logging logs</li>
            <li>Predicts P(recovery | context, action)</li>
            <li>Calculates ΔP over baseline WAIT probability</li>
            <li>Computes Net Incremental Recovery (NIR)</li>
          </ul>
        </div>

        <div className="boundary-box">
          <div className="boundary-header simulation">
            <Database size={18} />
            SIMULATION ENVIRONMENT
          </div>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
            Independent ground-truth real-world behavior strictly isolated from the decision engine:
          </p>
          <ul className="boundary-list">
            <li>Zero imports by ML inference or policy engine</li>
            <li>Hidden action uplift & retry fatigue equations</li>
            <li>Samples live outcomes for mock gateway</li>
            <li>Generates held-out evaluation benchmarks</li>
            <li>Prevents circular reasoning or hardcoded demos</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
