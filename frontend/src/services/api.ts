import type {
  AuditEventItem,
  BatchEvaluationResult,
  CaseListItem,
  DecisionExplanation,
  PaymentFailureEvent,
} from "../types/api";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        if (typeof errorJson.detail === "string") {
          errorDetail = errorJson.detail;
        } else if (Array.isArray(errorJson.detail)) {
          errorDetail = errorJson.detail.map((d: any) => `${d.loc?.slice(1).join(".") || d.loc?.join(".") || "field"}: ${d.msg}`).join("; ");
        } else {
          errorDetail = JSON.stringify(errorJson.detail);
        }
      }
    } catch {
      // Ignore parse failure
    }
    throw new Error(`API Error [${response.status}]: ${errorDetail}`);
  }

  return response.json();
}

export const api = {
  checkHealth: () => request<{ status: string }>("/health"),

  fetchCases: (limit = 50, offset = 0) =>
    request<CaseListItem[]>(`/cases/?limit=${limit}&offset=${offset}`),

  fetchCaseDecision: (caseId: string) =>
    request<DecisionExplanation>(`/cases/${caseId}/decision`),

  fetchCaseAudit: (caseId: string) =>
    request<AuditEventItem[]>(`/cases/${caseId}/audit`),

  submitFailureEvent: (event: PaymentFailureEvent) =>
    request<DecisionExplanation>("/cases/", {
      method: "POST",
      body: JSON.stringify(event),
    }),

  reevaluateCase: (caseId: string, gatewayHealthScore?: number) =>
    request<DecisionExplanation>(`/cases/${caseId}/reevaluate`, {
      method: "POST",
      body: JSON.stringify(
        gatewayHealthScore !== undefined
          ? { gateway_health_score: gatewayHealthScore }
          : {}
      ),
    }),

  runBatchEvaluation: (n = 500, seed = 777) =>
    request<BatchEvaluationResult>(`/evaluation/run?n=${n}&seed=${seed}`, {
      method: "POST",
    }),

  seedDemoCases: () =>
    request<CaseListItem[]>("/cases/seed", {
      method: "POST",
    }),
};

export function formatINR(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "0.0%";
  return `${(val * 100).toFixed(1)}%`;
}
