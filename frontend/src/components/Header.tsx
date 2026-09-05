import React from "react";
import { PlusCircle, RefreshCw } from "lucide-react";

interface HeaderProps {
  backendOnline: boolean;
  onOpenNewEvent: () => void;
  onSeedDemoCases: () => void;
  isSeeding: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  backendOnline,
  onOpenNewEvent,
  onSeedDemoCases,
  isSeeding,
}) => {
  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-title-row">
          <div className="brand-logo">R</div>
          <h1 className="brand-title">RecoveryOS</h1>
          <span className="brand-badge">AI Revenue Recovery</span>
        </div>
        <p className="brand-subtitle">
          Intelligent Payment Failure Recovery Orchestrator — Recover revenue intelligently
          by choosing the least intrusive action with the highest expected economic value.
        </p>
      </div>

      <div className="header-status">
        <div className="status-pill">
          <span
            className={`status-dot ${backendOnline ? "" : "disconnected"}`}
          />
          {backendOnline ? "Decision Engine Active" : "Backend Offline"}
        </div>

        <button
          className="btn btn-secondary"
          onClick={onSeedDemoCases}
          disabled={isSeeding || !backendOnline}
          title="Run 4 realistic failure events through the live pipeline"
        >
          <RefreshCw size={15} className={isSeeding ? "spinner" : ""} />
          {isSeeding ? "Running Pipeline..." : "Seed Pipeline Cases"}
        </button>

        <button
          className="btn btn-primary"
          onClick={onOpenNewEvent}
          disabled={!backendOnline}
        >
          <PlusCircle size={15} />
          Ingest Payment Failure
        </button>
      </div>
    </header>
  );
};
