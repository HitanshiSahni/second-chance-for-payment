export type ActionType =
  | "INFRASTRUCTURE_RECOVERY"
  | "SILENT_RETRY"
  | "WAIT"
  | "CUSTOMER_RESOLUTION"
  | "HALT";

export type CaseState =
  | "PAYMENT_FAILED"
  | "PROFILING"
  | "POLICY_CHECKED"
  | "ACTION_EVALUATED"
  | "EXECUTING"
  | "OUTCOME_CHECK"
  | "RE_EVALUATE"
  | "RECOVERED"
  | "HALTED"
  | "UNRECOVERABLE";

export type FailureCategory =
  | "INFRASTRUCTURE_TRANSIENT"
  | "TEMPORARY_PAYMENT_ISSUE"
  | "PAYMENT_METHOD_ISSUE"
  | "CUSTOMER_ACTION_REQUIRED"
  | "HARD_UNRECOVERABLE"
  | "UNKNOWN";

export interface ActionEvaluation {
  action: ActionType;
  predicted_recovery_probability: number;
  baseline_probability: number;
  delta_p: number;
  transaction_value: number;
  intervention_cost: number;
  nir: number;
  resolution_type?: string | null;
}

export interface DecisionExplanation {
  case_id: string;
  failure_category: FailureCategory;
  available_actions: ActionType[];
  blocked_actions: Record<string, string>;
  evaluations: ActionEvaluation[];
  selected_action: ActionType;
  selection_reason: string;
  current_state?: CaseState | null;
}

export interface CaseListItem {
  id: string;
  transaction_id: string;
  customer_id?: string | null;
  amount: number;
  currency: string;
  failure_code: string;
  failure_category?: string | null;
  state: CaseState;
  selected_action?: ActionType | null;
  is_recovered: boolean;
  recovered_amount?: number | null;
  reevaluation_count: number;
  next_evaluation_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditEventItem {
  event_id: string;
  event_type: string;
  previous_state?: string | null;
  new_state?: string | null;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface SystemEvaluation {
  system: string;
  total_transactions: number;
  total_at_risk_revenue: number;
  recovered_revenue: number;
  recovery_rate: number;
  intervention_cost_total: number;
  net_recovered_value: number;
  customer_interventions: number;
  halted_cases: number;
  action_distribution: Record<string, number>;
}

export interface BatchEvaluationResult {
  recoveryos: SystemEvaluation;
  blind_retry_baseline: SystemEvaluation;
  net_recovered_value_improvement: number;
}

export interface PaymentFailureEvent {
  transaction_id: string;
  amount: number;
  currency?: string;
  failure_code: string;
  gateway?: string;
  gateway_health_score?: number;
  customer_id?: string;
  customer_tenure_days?: number;
  previous_attempts?: number;
  previous_failures?: number;
  previous_successful_payments?: number;
  is_recurring?: boolean;
}
