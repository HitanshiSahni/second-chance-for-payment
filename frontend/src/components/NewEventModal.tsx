import React, { useState } from "react";
import { X, Send } from "lucide-react";
import type { PaymentFailureEvent } from "../types/api";

interface NewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: PaymentFailureEvent) => Promise<void>;
  isSubmitting: boolean;
}

const FAILURE_CODES = [
  "CARD_EXPIRED",
  "GATEWAY_TIMEOUT",
  "RATE_LIMITED",
  "FRAUD_SUSPECTED",
  "INSUFFICIENT_FUNDS",
  "ISSUER_DECLINED_SOFT",
  "3DS_AUTHENTICATION_REQUIRED",
  "OTP_FAILED",
  "CARD_REPORTED_LOST_OR_STOLEN",
  "GATEWAY_UNAVAILABLE",
];

export const NewEventModal: React.FC<NewEventModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  if (!isOpen) return null;

  const [transactionId, setTransactionId] = useState(
    () => `TXN-MANUAL-${Math.floor(1000 + Math.random() * 9000)}`
  );
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#fff" }}>
            Ingest Payment Failure Event
          </h3>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Transaction ID</label>
              <input
                type="text"
                className="form-input"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Amount (INR)</label>
              <input
                type="number"
                step="1"
                min="1"
                className="form-input"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Failure Code</label>
              <select
                className="form-select"
                value={failureCode}
                onChange={(e) => setFailureCode(e.target.value)}
              >
                {FAILURE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Gateway Health: <strong>{(gatewayHealth * 100).toFixed(0)}%</strong>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={gatewayHealth}
                onChange={(e) => setGatewayHealth(Number(e.target.value))}
                style={{ marginTop: "0.5rem", accentColor: "var(--accent-primary)" }}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Customer Tenure (Days)</label>
              <input
                type="number"
                className="form-input"
                value={customerTenure}
                onChange={(e) => setCustomerTenure(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Prior Successful Payments</label>
              <input
                type="number"
                className="form-input"
                value={prevSuccess}
                onChange={(e) => setPrevSuccess(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Prior Failed Attempts This Transaction</label>
            <input
              type="number"
              min="0"
              max="5"
              className="form-input"
              value={prevAttempts}
              onChange={(e) => setPrevAttempts(Number(e.target.value))}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
            <input
              type="checkbox"
              id="isRecurringCheck"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              style={{ accentColor: "var(--accent-primary)", width: "16px", height: "16px" }}
            />
            <label htmlFor="isRecurringCheck" style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              Subscription / Recurring Payment Mandate
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              <Send size={15} />
              {isSubmitting ? "Processing Through Pipeline..." : "Process Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
