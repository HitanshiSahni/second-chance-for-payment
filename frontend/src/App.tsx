import React, { useEffect, useState, useCallback } from "react";
import { Sidebar, type NavRoute } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { NewEventModal } from "./components/NewEventModal";
import { Overview } from "./pages/Overview";
import { BenchmarkLab } from "./pages/BenchmarkLab";
import { DecisionReplayPage } from "./pages/DecisionReplayPage";
import { Simulator } from "./pages/Simulator";
import { LiveCases } from "./pages/LiveCases";
import { ArchitecturePage } from "./pages/ArchitecturePage";
import { LandingPage } from "./pages/LandingPage";
import { api } from "./services/api";
import type {
  AuditEventItem,
  BatchEvaluationResult,
  CaseListItem,
  DecisionExplanation,
  PaymentFailureEvent,
} from "./types/api";

export const App: React.FC = () => {
  // Landing page vs dashboard
  const [showLanding, setShowLanding] = useState<boolean>(() => {
    const raw = window.location.hash.replace("#", "");
    const landingHashes = ["", "features", "pipeline", "tech", "landing"];
    return landingHashes.includes(raw);
  });

  // Navigation & Shell State
  const [currentRoute, setCurrentRoute] = useState<NavRoute>(() => {
    const hash = window.location.hash.replace("#", "") as NavRoute;
    const validRoutes: NavRoute[] = [
      "overview",
      "benchmark",
      "decision-replay",
      "simulator",
      "cases",
      "architecture",
    ];
    return validRoutes.includes(hash) ? hash : "overview";
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Backend & Pipeline State
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // Decision & Audit Forensic State
  const [decision, setDecision] = useState<DecisionExplanation | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditEventItem[]>([]);
  const [loadingDecision, setLoadingDecision] = useState<boolean>(false);

  // Benchmark State
  const [batchResult, setBatchResult] = useState<BatchEvaluationResult | null>(null);
  const [loadingBatch, setLoadingBatch] = useState<boolean>(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [benchmarkParams, setBenchmarkParams] = useState<{ n: number; seed: number }>({
    n: 500,
    seed: 777,
  });

  // Modals & Action Status
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState<boolean>(false);
  const [reevaluating, setReevaluating] = useState<boolean>(false);

  // Check health and initialize
  const checkBackendAndInit = useCallback(async () => {
    try {
      await api.checkHealth();
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    }
  }, []);

  // Fetch all cases
  const loadCases = useCallback(async (selectFirstIfNone = false) => {
    try {
      const fetchedCases = await api.fetchCases();
      setCases(fetchedCases);
      if (fetchedCases.length > 0) {
        setSelectedCaseId((prev) =>
          prev && fetchedCases.some((c) => c.id === prev) ? prev : fetchedCases[0].id
        );
      } else if (selectFirstIfNone) {
        // Automatically seed demo archetypes if database is brand new
        seedCases();
      }
    } catch (err: any) {
      console.error("Failed to load cases:", err);
    }
  }, []);

  // Load decision and audit for the selected case
  const loadCaseDetails = useCallback(async (caseId: string) => {
    setLoadingDecision(true);
    try {
      const [dec, audit] = await Promise.all([
        api.fetchCaseDecision(caseId).catch(() => null),
        api.fetchCaseAudit(caseId).catch(() => []),
      ]);
      setDecision(dec);
      setAuditTrail(audit);
    } catch (err: any) {
      console.error("Failed to fetch case details:", err);
    } finally {
      setLoadingDecision(false);
    }
  }, []);

  // Run Batch Evaluation
  const runBatchEvaluation = async (n = 500, seed = 777) => {
    setBenchmarkParams({ n, seed });
    setLoadingBatch(true);
    setBatchError(null);
    try {
      const res = await api.runBatchEvaluation(n, seed);
      setBatchResult(res);
    } catch (err: any) {
      setBatchError(err.message || "Failed to execute batch evaluation.");
    } finally {
      setLoadingBatch(false);
    }
  };

  // Seed Demo Cases
  const seedCases = async () => {
    setIsSeeding(true);
    try {
      const newCases = await api.seedDemoCases();
      setCases(newCases);
      if (newCases.length > 0) {
        setSelectedCaseId(newCases[0].id);
      }
    } catch (err: any) {
      console.error("Failed to seed cases:", err);
    } finally {
      setIsSeeding(false);
    }
  };

  // Re-evaluate a case in RE_EVALUATE
  const handleReevaluate = async (caseId: string, healthScore?: number) => {
    setReevaluating(true);
    try {
      const updatedDecision = await api.reevaluateCase(caseId, healthScore);
      setDecision(updatedDecision);
      await Promise.all([loadCases(), loadCaseDetails(caseId)]);
    } catch (err: any) {
      alert(`Re-evaluation failed: ${err.message}`);
    } finally {
      setReevaluating(false);
    }
  };

  // Ingest manual failure event
  const handleSubmitNewEvent = async (event: PaymentFailureEvent) => {
    setIsSubmittingEvent(true);
    try {
      const newDecision = await api.submitFailureEvent(event);
      setIsModalOpen(false);
      await loadCases();
      setSelectedCaseId(newDecision.case_id);
      handleNavigate("decision-replay", newDecision.case_id);
    } catch (err: any) {
      alert(`Failed to process event: ${err.message}`);
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  // Central Navigation Dispatcher
  const handleNavigate = (route: NavRoute, caseId?: string) => {
    if (caseId) {
      setSelectedCaseId(caseId);
    }
    setCurrentRoute(route);
    window.location.hash = route;
    setShowLanding(false);
  };

  // Enter dashboard from landing
  const handleEnterDashboard = () => {
    setShowLanding(false);
    setCurrentRoute("overview");
    window.location.hash = "overview";
  };

  // Synchronize hash changes
  useEffect(() => {
    const onHashChange = () => {
      const rawHash = window.location.hash.replace("#", "");
      const validRoutes: NavRoute[] = [
        "overview",
        "benchmark",
        "decision-replay",
        "simulator",
        "cases",
        "architecture",
      ];
      if (validRoutes.includes(rawHash as NavRoute)) {
        setCurrentRoute(rawHash as NavRoute);
        setShowLanding(false);
      } else if (rawHash === "" || ["features", "pipeline", "tech", "landing"].includes(rawHash)) {
        setShowLanding(true);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Poll backend health every 10 seconds
  useEffect(() => {
    checkBackendAndInit();
    const interval = setInterval(checkBackendAndInit, 10000);
    return () => clearInterval(interval);
  }, [checkBackendAndInit]);

  // Initial load once backend is detected online
  useEffect(() => {
    if (backendOnline) {
      loadCases(true);
      runBatchEvaluation(500, 777);
    }
  }, [backendOnline, loadCases]);

  // Load details whenever selectedCaseId changes
  useEffect(() => {
    if (selectedCaseId) {
      loadCaseDetails(selectedCaseId);
    }
  }, [selectedCaseId, loadCaseDetails]);

  // LANDING PAGE
  if (showLanding) {
    return <LandingPage onEnterDashboard={handleEnterDashboard} />;
  }

  // DASHBOARD
  return (
    <div className={`app-layout ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {/* 1. COLLAPSIBLE SIDEBAR */}
      <Sidebar
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        collapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        backendOnline={backendOnline}
        casesCount={cases.length}
      />

      {/* 2. MAIN VIEWPORT */}
      <div className="app-main">
        {/* Topbar Header */}
        <Topbar
          currentRoute={currentRoute}
          backendOnline={backendOnline}
          onOpenNewEvent={() => setIsModalOpen(true)}
          onSeedDemoCases={seedCases}
          isSeeding={isSeeding}
        />

        {/* Dynamic Route Viewport */}
        <main className="app-content" key={currentRoute}>
          {currentRoute === "overview" && (
            <Overview
              cases={cases}
              batchResult={batchResult}
              onNavigate={handleNavigate}
              onOpenNewEvent={() => setIsModalOpen(true)}
              onSeedDemoCases={seedCases}
              isSeeding={isSeeding}
            />
          )}

          {currentRoute === "benchmark" && (
            <BenchmarkLab
              batchResult={batchResult}
              loading={loadingBatch}
              error={batchError}
              onRunBatch={runBatchEvaluation}
              lastN={benchmarkParams.n}
              lastSeed={benchmarkParams.seed}
            />
          )}

          {currentRoute === "decision-replay" && (
            <DecisionReplayPage
              cases={cases}
              selectedCaseId={selectedCaseId}
              onSelectCase={(id) => setSelectedCaseId(id)}
              decision={decision}
              auditTrail={auditTrail}
              loadingDecision={loadingDecision}
              onReevaluate={handleReevaluate}
              reevaluating={reevaluating}
              onOpenNewEvent={() => setIsModalOpen(true)}
            />
          )}

          {currentRoute === "simulator" && (
            <Simulator
              onNavigate={handleNavigate}
              onCaseCreated={() => loadCases()}
            />
          )}

          {currentRoute === "cases" && (
            <LiveCases
              cases={cases}
              onNavigate={handleNavigate}
              onOpenNewEvent={() => setIsModalOpen(true)}
              onSeedDemoCases={seedCases}
              isSeeding={isSeeding}
            />
          )}

          {currentRoute === "architecture" && (
            <ArchitecturePage onNavigate={handleNavigate} />
          )}
        </main>
      </div>

      {/* INGEST PAYMENT FAILURE MODAL */}
      <NewEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitNewEvent}
        isSubmitting={isSubmittingEvent}
      />
    </div>
  );
};

export default App;
