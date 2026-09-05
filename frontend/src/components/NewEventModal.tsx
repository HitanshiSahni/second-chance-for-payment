import React, { useState } from "react";
import { X, Send, RefreshCw, Loader2 } from "lucide-react";
import type { PaymentFailureEvent } from "../types/api";

interface NewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: PaymentFailureEvent) => Promise<void>;
  isSubmitting: boolean;
}

const FAILURE_CODES = [
  { code: "CARD_EXPIRED", label: "CARD_EXPIRED — Expired Payment Instrument" },
  { code: "GATEWAY_TIMEOUT", label: "GATEWAY_TIMEOUT — Network / PSP Timeout" },
  { code: "RATE_LIMITED", label: "RATE_LIMITED — Issuer Velocity Throttle" },
  { code: "FRAUD_SUSPECTED", label: "FRAUD_SUSPECTED — Risk Engine Flag" },
  { code: "INSUFFICIENT_FUNDS", label: "INSUFFICIENT_FUNDS — Soft Balance Decline" },
  { code: "ISSUER_DECLINED_SOFT", label: "ISSUER_DECLINED_SOFT — Temporary Issuer Block" },
  { code: "3DS_AUTHENTICATION_REQUIRED", label: "3DS_AUTHENTICATION_REQUIRED — Customer Auth Step" },
  { code: "OTP_FAILED", label: "OTP_FAILED — Customer Verification Dropout" },
  { code: "CARD_REPORTED_LOST_OR_STOLEN", label: "CARD_REPORTED_LOST_OR_STOLEN — Hard Decline" },
  { code: "GATEWAY_UNAVAILABLE", label: "GATEWAY_UNAVAILABLE — Infrastructure Outage" },
];

export const NewEventModal: React.FC<NewEventModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  if (!isOpen) return null;

  const generateTxnId = () => `TXN-MANUAL-${Math.floor(1000 + Math.random() * 9000)}`;

  const [transactionId, setTransactionId] = useState<string>(generateTxnId);
  const [amount, setAmount] = useState<number>(3499);
  const [failureCode, setFailureCode] = useState<string>("CARD_EXPIRED");
  const [gatewayHealth, setGatewayHealth] = useState<number>(0.9);
  const [customerTenure, setCustomerTenure] = useState<number>(365);
  const [prevSuccess, setPrevSuccess] = useState<number>(8);
  const [prevAttempts, setPrevAttempts] = useState<number>(0);
  const [isRecurring, setIsRecurring] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      transaction_id: transactionId,
      amount,
      failure_code: failureCode,
      gateway_health_score: gatewayHealth,
      customer_tenure_days: customerTenure,
      previous_successful_payments: prevSuccess,
      previous_attempts: prevAttempts,
      is_recurring: isRecurring,
      customer_id: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
    });
  };

  const healthPercent = Math.round(gatewayHealth * 100);
  const getHealthBadge = () => {
    if (gatewayHealth >= 0.8) {
      return { text: `${healthPercent}% • Optimal`, color: "var(--emerald)" };
    }
    if (gatewayHealth >= 0.5) {
      return { text: `${healthPercent}% • Degraded`, color: "var(--amber)" };
    }
    return { text: `${healthPercent}% • Critical`, color: "var(--rose)" };
  };

  const healthInfo = getHealthBadge();

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <img
                src="/Second_Logo.png"
                alt="Second"
                style={{ width: "26px", height: "26px", borderRadius: "5px", objectFit: "cover" }}
              />
            </div>
            <div>
              <h3 className="modal-title">Ingest Payment Failure Event</h3>
              <p className="modal-subtitle">
                Inject a real-time gateway drop into the autonomous recovery pipeline
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div className="modal-body">
            {/* Row 1: Transaction ID & Amount */}
            <div className="form-row">
              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="form-label" htmlFor="event-txn-id" style={{ margin: 0 }}>
                    Transaction ID
                  </label>
                  <button
                    type="button"
                    onClick={() => setTransactionId(generateTxnId())}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--rzp-blue)",
                      cursor: "pointer",
                      fontSize: "0.6875rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      padding: 0,
                    }}
                    title="Generate new ID"
                  >
                    <RefreshCw size={11} /> Regenerate
                  </button>
                </div>
                <input
                  id="event-txn-id"
                  type="text"
                  className="form-input mono"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. TXN-12345"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="event-amount">
                  Payment Amount (INR)
                </label>
                <input
                  id="event-amount"
                  type="number"
                  step="1"
                  min="1"
                  className="form-input mono"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  required
                />
                <div className="amount-chips">
                  {[999, 3499, 12500, 49999].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`amount-chip ${amount === preset ? "active" : ""}`}
                      onClick={() => setAmount(preset)}
                    >
                      ₹{preset.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: Failure Code & Gateway Health */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="event-failure-code">
                  Failure Reason Archetype
                </label>
                <select
                  id="event-failure-code"
                  className="form-select"
                  value={failureCode}
                  onChange={(e) => setFailureCode(e.target.value)}
                >
                  {FAILURE_CODES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="form-label" htmlFor="event-gateway-health" style={{ margin: 0 }}>
                    Gateway Health Score
                  </label>
                  <span
                    className="mono"
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: healthInfo.color,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {healthInfo.text}
                  </span>
                </div>
                <input
                  id="event-gateway-health"
                  type="range"
                  className="form-range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={gatewayHealth}
                  onChange={(e) => setGatewayHealth(Number(e.target.value))}
                />
                <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                  Dynamic routing uses health score to arbitrate between PSP re-route & backoff
                </span>
              </div>
            </div>

            {/* Row 3: Customer Tenure & Prior Successes */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="event-tenure">
                  Customer Tenure (Days)
                </label>
                <input
                  id="event-tenure"
                  type="number"
                  min="1"
                  className="form-input mono"
                  value={customerTenure}
                  onChange={(e) => setCustomerTenure(Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="event-prev-success">
                  Prior Successful Payments
                </label>
                <input
                  id="event-prev-success"
                  type="number"
                  min="0"
                  className="form-input mono"
                  value={prevSuccess}
                  onChange={(e) => setPrevSuccess(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Row 4: Prior Failed Attempts */}
            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="form-label" htmlFor="event-prev-attempts" style={{ margin: 0 }}>
                  Prior Failed Attempts This Transaction
                </label>
                <span
                  style={{
                    fontSize: "0.6875rem",
                    color: prevAttempts >= 2 ? "var(--amber)" : "var(--text-muted)",
                  }}
                >
                  {prevAttempts >= 2 ? "High retry velocity: risk of issuer fatigue" : "Standard range (0-1)"}
                </span>
              </div>
              <input
                id="event-prev-attempts"
                type="number"
                min="0"
                max="5"
                className="form-input mono"
                value={prevAttempts}
                onChange={(e) => setPrevAttempts(Number(e.target.value))}
              />
            </div>

            {/* Row 5: Mandate / Recurring Mandate Card */}
            <label className="mandate-card" htmlFor="isRecurringCheck">
              <input
                type="checkbox"
                id="isRecurringCheck"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  Subscription / Recurring Payment Mandate
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                  Flags transaction for automated UPI / card e-mandate retry policies, grace windows, and silent renewal execution
                </span>
              </div>
            </label>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: "0 0 20px rgba(82, 143, 240, 0.35)",
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spin" />
                  Processing Through Pipeline...
                </>
              ) : (
                <>
                  <Send size={15} />
                  Process Event
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
