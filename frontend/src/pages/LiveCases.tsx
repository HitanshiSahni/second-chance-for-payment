import React, { useState, useRef } from "react";
import {
  CreditCard,
  Search,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  AlertCircle,
} from "lucide-react";
import type { CaseListItem } from "../types/api";
import { formatINR, formatPercent } from "../services/api";
import type { NavRoute } from "../components/Sidebar";
import { useScrollReveal } from "../hooks/useScrollReveal";

interface LiveCasesProps {
  cases: CaseListItem[];
  onNavigate: (route: NavRoute, caseId?: string) => void;
  onOpenNewEvent: () => void;
  onSeedDemoCases: () => void;
  isSeeding: boolean;
}

export const LiveCases: React.FC<LiveCasesProps> = ({
  cases,
  onNavigate,
  onOpenNewEvent,
  onSeedDemoCases,
  isSeeding,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "RECOVERED" | "RE_EVALUATE" | "HALTED">("ALL");

  const recoveredCases = cases.filter((c) => c.is_recovered);
  const reevalCases = cases.filter((c) => c.state === "RE_EVALUATE");
  const haltedCases = cases.filter((c) => c.state === "HALTED" || c.state === "UNRECOVERABLE");

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.failure_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.customer_id && c.customer_id.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter === "RECOVERED") return c.is_recovered;
    if (statusFilter === "RE_EVALUATE") return c.state === "RE_EVALUATE";
    if (statusFilter === "HALTED") return c.state === "HALTED" || c.state === "UNRECOVERABLE";
    return true;
  });

  const totalVolume = cases.reduce((acc, c) => acc + c.amount, 0);
  const recoveredVolume = recoveredCases.reduce((acc, c) => acc + (c.recovered_amount || c.amount), 0);

  const pageRef = useRef<HTMLDivElement>(null);
  useScrollReveal(pageRef);

  return (
    <div className="live-cases-page" ref={pageRef}>
      {/* Top Operations Summary Strip */}
      <div className="metrics-grid">
        <div className="metric-card scroll-reveal delay-1">
          <span className="metric-label">Total Ingested Cases</span>
          <span className="metric-value">{cases.length}</span>
          <span className="metric-sub">Tracked in SQLite database</span>
        </div>

        <div className="metric-card scroll-reveal delay-2">
          <span className="metric-label">Pipeline Volume</span>
          <span className="metric-value">{formatINR(totalVolume)}</span>
          <span className="metric-sub">Total failed payment volume</span>
        </div>

        <div className="metric-card scroll-reveal delay-3">
          <span className="metric-label">Recovered Volume</span>
          <span className="metric-value emerald">{formatINR(recoveredVolume)}</span>
          <span className="metric-sub">
            Recovery Rate: <strong>{formatPercent(cases.length > 0 ? recoveredCases.length / cases.length : 0)}</strong>
          </span>
        </div>

        <div className="metric-card scroll-reveal delay-4">
          <span className="metric-label">Awaiting Re-evaluation</span>
          <span className="metric-value amber">{reevalCases.length}</span>
          <span className="metric-sub">Sleeping in wait loop</span>
        </div>
      </div>

      {/* Main Operations Table Card */}
      <div className="card scroll-reveal delay-2">
        <div className="card-header" style={{ flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h3 className="card-title">
              <CreditCard size={18} className="indigo" />
              Live Operations Register
            </h3>
            <p className="card-subtitle">
              Real-time payment failure recovery lifecycle tracking across all ingested transactions
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            {/* Filter Pills */}
            <div style={{ display: "flex", background: "var(--bg-surface-elevated)", borderRadius: "var(--radius-sm)", padding: "2px", border: "1px solid var(--border-default)" }}>
              {[
                { id: "ALL", label: `All (${cases.length})` },
                { id: "RECOVERED", label: `Recovered (${recoveredCases.length})` },
                { id: "RE_EVALUATE", label: `Re-eval (${reevalCases.length})` },
                { id: "HALTED", label: `Halted (${haltedCases.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as any)}
                  style={{
                    background: statusFilter === tab.id ? "var(--indigo)" : "transparent",
                    color: statusFilter === tab.id ? "#fff" : "var(--text-secondary)",
                    border: "none",
                    padding: "0.25rem 0.6rem",
                    borderRadius: "calc(var(--radius-sm) - 2px)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search transaction..."
                className="form-input"
                style={{ width: "200px", paddingLeft: "2rem" }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search
                size={14}
                style={{ position: "absolute", left: "0.65rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
              />
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={onSeedDemoCases}
              disabled={isSeeding}
              style={{ padding: "0.4rem 0.75rem" }}
            >
              <RefreshCw size={13} className={isSeeding ? "spinner" : ""} />
              <span>Seed Cases</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={onOpenNewEvent}
              style={{ padding: "0.4rem 0.75rem" }}
            >
              <PlusCircle size={13} />
              <span>Ingest Failure</span>
            </button>
          </div>
        </div>

        {filteredCases.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={28} className="amber" />
            <h4 style={{ color: "#fff", fontWeight: 600 }}>No Cases Matching Filter</h4>
            <p>Try clearing your search term or select "All" to view all recorded transactions.</p>
          </div>
        ) : (
          <div className="comparison-table-container">
            <table className="operations-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Failure Reason</th>
                  <th>Classification</th>
                  <th>Selected Action</th>
                  <th>FSM State</th>
                  <th>Re-evals</th>
                  <th style={{ textAlign: "right" }}>Forensics</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c) => (
                  <tr key={c.id}>
                    <td className="mono" style={{ fontWeight: 600 }}>
                      {c.transaction_id}
                    </td>
                    <td className="mono" style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {c.customer_id || "ANONYMOUS"}
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
                    <td className="mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {c.reevaluation_count}/5
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: "0.25rem 0.55rem", fontSize: "0.6875rem" }}
                        onClick={() => onNavigate("decision-replay", c.id)}
                      >
                        Inspect <ArrowRight size={11} />
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
