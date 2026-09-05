import { PlusCircle, RefreshCw } from "lucide-react";
import type { NavRoute } from "./Sidebar";

interface TopbarProps {
  currentRoute: NavRoute;
  backendOnline: boolean;
  onOpenNewEvent: () => void;
  onSeedDemoCases: () => void;
  isSeeding: boolean;
}

const ROUTE_CONTEXTS: Record<NavRoute, { title: string; subtitle: string }> = {
  overview: {
    title: "Command Center",
    subtitle: "Real-time executive recovery intelligence & active failure pipeline",
  },
  benchmark: {
    title: "Benchmark Lab",
    subtitle: "Monte Carlo financial research: RecoveryOS vs Blind Retry baseline",
  },
  "decision-replay": {
    title: "Decision Replay",
    subtitle: "Forensic AI decision investigation workspace & immutable audit ledger",
  },
  simulator: {
    title: "Recovery Simulator",
    subtitle: "Interactive sandbox for real-time payment failure evaluation",
  },
  cases: {
    title: "Live Operations",
    subtitle: "Operational tracking of all ingested payment failure cases",
  },
  architecture: {
    title: "System Architecture & AI Boundaries",
    subtitle: "Where AI decides — and where deterministic policy governs",
  },
};

export const Topbar: React.FC<TopbarProps> = ({
  currentRoute,
  backendOnline,
  onOpenNewEvent,
  onSeedDemoCases,
  isSeeding,
}) => {
  const context = ROUTE_CONTEXTS[currentRoute] || {
    title: "RecoveryOS",
    subtitle: "AI Revenue Recovery Orchestrator",
  };

  return (
    <header className="app-topbar">
      <div className="topbar-context">
        <h1 className="topbar-title">{context.title}</h1>
        <p className="topbar-desc">{context.subtitle}</p>
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onSeedDemoCases}
          disabled={isSeeding || !backendOnline}
          title="Run 4 realistic archetypes genuinely through the full pipeline"
        >
          <RefreshCw size={14} className={isSeeding ? "spinner" : ""} />
          <span>{isSeeding ? "Running Pipeline..." : "Seed Pipeline Cases"}</span>
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={onOpenNewEvent}
          disabled={!backendOnline}
        >
          <PlusCircle size={14} />
          <span>Ingest Payment Failure</span>
        </button>
      </div>
    </header>
  );
};
