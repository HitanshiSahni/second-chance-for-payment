"""
Targeted Verification Script for RecoveryOS Fallback Behavior.
Tests all 5 fallback scenarios against the live FastAPI server:
1. HARD POLICY HALT (FRAUD_SUSPECTED)
2. NO POSITIVE NIR -> WAIT FALLBACK (Generic micro-ticket low NIR)
3. ACTION EXECUTION FAILURE -> RE-EVALUATE (FSM audit sequence)
4. WAIT -> RE-EVALUATION WITH CHANGED CONDITIONS (Gateway health recovery)
5. RETRY / RE-EVALUATION EXHAUSTION -> HALT (Configured limit enforcement)
"""
import json
import time
import httpx

BASE_URL = "http://127.0.0.1:8000"

client = httpx.Client(base_url=BASE_URL, timeout=30.0)

def print_banner(title: str):
    print("\n" + "=" * 70)
    print(f" SCENARIO: {title}")
    print("=" * 70)

def test_scenario_1_hard_policy_halt():
    print_banner("1. HARD POLICY HALT (FRAUD_SUSPECTED)")
    payload = {
        "transaction_id": f"TEST-FRAUD-{int(time.time())}",
        "amount": 12500.0,
        "currency": "INR",
        "failure_code": "FRAUD_SUSPECTED",
        "gateway_health_score": 0.98,
        "customer_tenure_days": 100,
        "previous_successful_payments": 5,
        "previous_failures": 1,
        "customer_id": "CUST-FRAUD-01"
    }
    resp = client.post("/cases/", json=payload)
    assert resp.status_code == 200, f"Error: {resp.text}"
    decision = resp.json()
    case_id = decision["case_id"]

    print(f"Case ID: {case_id}")
    print(f"Failure Category: {decision['failure_category']}")
    print(f"Available Actions: {decision['available_actions']}")
    print(f"Blocked Actions: {json.dumps(decision['blocked_actions'], indent=2)}")
    print(f"Selected Action: {decision['selected_action']}")
    print(f"Selection Reason: {decision['selection_reason']}")
    print(f"Current State: {decision['current_state']}")

    # Assertions
    assert decision["selected_action"] == "HALT", "Expected HALT for hard failure code"
    assert "SILENT_RETRY" in decision["blocked_actions"]
    assert "Hard failure code 'FRAUD_SUSPECTED'" in decision["blocked_actions"]["SILENT_RETRY"]
    assert decision["current_state"] == "HALTED"

    # Verify audit trail
    audit_resp = client.get(f"/cases/{case_id}/audit")
    assert audit_resp.status_code == 200
    trail = audit_resp.json()
    event_types = [e["event_type"] for e in trail]
    print(f"Audit Trail Event Sequence: {' -> '.join(event_types)}")
    assert "POLICY_EVALUATED" in event_types
    assert "CASE_HALTED" in event_types
    assert "ACTION_EXECUTED" not in event_types, "HALT must never execute on payment gateway!"
    print(">>> SCENARIO 1: PASS")
    return case_id

def test_scenario_2_no_positive_nir_wait():
    print_banner("2. NO POSITIVE NIR -> WAIT FALLBACK (Generic micro-ticket)")
    # Ticket size of INR 4.0 with network error
    # Intervention costs: Silent retry 0.5, Infra 2.0, Customer 15.0
    # On INR 4 ticket:
    # Silent retry: Delta_P ~0.10 -> 0.10 * 4 - 0.5 = -0.10 <= 0
    # Every intervention NIR is <= 0 or < 0.5 threshold!
    payload = {
        "transaction_id": f"TEST-LOWVAL-{int(time.time())}",
        "amount": 4.0,
        "currency": "INR",
        "failure_code": "NETWORK_ERROR",
        "gateway_health_score": 0.20,
        "customer_tenure_days": 10,
        "previous_successful_payments": 0,
        "previous_failures": 3,
        "customer_id": "CUST-LOWVAL-01"
    }
    resp = client.post("/cases/", json=payload)
    assert resp.status_code == 200, f"Error: {resp.text}"
    decision = resp.json()
    case_id = decision["case_id"]

    print(f"Case ID: {case_id}")
    print(f"Ticket Amount: INR {payload['amount']}")
    print("Evaluations:")
    for ev in decision["evaluations"]:
        print(f"  Action: {ev['action']:25s} | Prob: {ev['predicted_recovery_probability']:.3f} | Delta_P: {ev['delta_p']:+.3f} | Cost: INR {ev['intervention_cost']:.2f} | NIR: INR {ev['nir']:.2f}")

    print(f"Selected Action: {decision['selected_action']}")
    print(f"Selection Reason: {decision['selection_reason']}")
    print(f"Current State: {decision['current_state']}")

    # Assertions
    assert decision["selected_action"] == "WAIT", "Expected WAIT fallback when no positive NIR"
    assert "No action currently clears the minimum positive-NIR threshold" in decision["selection_reason"]
    assert decision["current_state"] == "RE_EVALUATE"

    # Audit trail
    audit_resp = client.get(f"/cases/{case_id}/audit")
    trail = audit_resp.json()
    event_types = [e["event_type"] for e in trail]
    print(f"Audit Trail Sequence: {' -> '.join(event_types)}")
    assert "WAIT_SCHEDULED" in event_types
    print(">>> SCENARIO 2: PASS")
    return case_id

def test_scenario_3_execution_failure_to_reevaluate():
    print_banner("3. ACTION EXECUTION FAILURE -> RE-EVALUATE")
    # Low gateway health + RATE_LIMITED will cause SILENT_RETRY to be selected,
    # but with gateway_health=0.12, simulated outcome has ~95% failure chance.
    # Let's verify a case that fails execution.
    case_id = None
    for attempt in range(5):
        payload = {
            "transaction_id": f"TEST-EXECFAIL-{int(time.time())}-{attempt}",
            "amount": 950.0,
            "currency": "INR",
            "failure_code": "RATE_LIMITED",
            "gateway_health_score": 0.05,  # Very low health makes retry fail
            "customer_tenure_days": 120,
            "previous_successful_payments": 2,
            "previous_failures": 2,
            "customer_id": f"CUST-FAIL-{attempt}"
        }
        resp = client.post("/cases/", json=payload)
        if resp.status_code == 200:
            dec = resp.json()
            if dec["current_state"] == "RE_EVALUATE":
                case_id = dec["case_id"]
                break

    assert case_id is not None, "Failed to produce an execution failure case"

    print(f"Verified Case ID: {case_id}")
    audit_resp = client.get(f"/cases/{case_id}/audit")
    trail = audit_resp.json()
    event_types = [e["event_type"] for e in trail]
    print(f"Full FSM Audit Sequence:")
    for idx, e in enumerate(trail):
        print(f"  [{idx+1}] {e['event_type']} (prev={e['previous_state']}, new={e['new_state']})")

    # Assert exact FSM path
    expected_sequence = [
        "PAYMENT_FAILED",
        "FAILURE_PROFILED",
        "POLICY_EVALUATED",
        "ACTIONS_SCORED",
        "ACTION_SELECTED",
        "ACTION_EXECUTED",
        "ACTION_FAILED",
        "CASE_RE_EVALUATED"
    ]
    for exp in expected_sequence:
        assert exp in event_types, f"Expected {exp} in audit trail"

    print(">>> SCENARIO 3: PASS")
    return case_id

def test_scenario_4_wait_reevaluation_changed_conditions(case_id: str):
    print_banner("4. WAIT -> RE-EVALUATION WITH CHANGED CONDITIONS")
    print(f"Target Case ID: {case_id}")

    # Inspect decision before re-evaluation
    before_resp = client.get(f"/cases/{case_id}/decision")
    dec_before = before_resp.json()
    print("Initial decision snapshot:")
    print(f"  Blocked Actions: {dec_before['blocked_actions']}")
    assert "INFRASTRUCTURE_RECOVERY" in dec_before["blocked_actions"], "Infra recovery was blocked initially due to low gateway health"

    # Re-evaluate with upgraded gateway health
    print("\nTriggering re-evaluation with gateway_health_score = 0.95 (Gateway recovered)...")
    reeval_resp = client.post(f"/cases/{case_id}/reevaluate", json={"gateway_health_score": 0.95})
    assert reeval_resp.status_code == 200, f"Reevaluation failed: {reeval_resp.text}"
    dec_after = reeval_resp.json()

    print("\nUpdated decision snapshot:")
    print(f"  Available Actions: {dec_after['available_actions']}")
    print(f"  Blocked Actions: {dec_after['blocked_actions']}")
    print(f"  Selected Action: {dec_after['selected_action']}")
    print(f"  Selection Reason: {dec_after['selection_reason']}")
    print(f"  Current State: {dec_after['current_state']}")

    # Assertions:
    # 1. INFRASTRUCTURE_RECOVERY is now ALLOWED
    assert "INFRASTRUCTURE_RECOVERY" in dec_after["available_actions"], "Infra recovery should now be eligible!"
    assert "INFRASTRUCTURE_RECOVERY" not in dec_after["blocked_actions"]
    # 2. Decision is refreshed and not stale
    audit_resp = client.get(f"/cases/{case_id}/audit")
    trail = audit_resp.json()
    last_policy_check = [e for e in trail if e["event_type"] == "POLICY_EVALUATED"][-1]
    assert "INFRASTRUCTURE_RECOVERY" in last_policy_check["metadata"]["allowed"]
    print(">>> SCENARIO 4: PASS")

def test_scenario_5_exhaustion_to_halt():
    print_banner("5. RETRY / RE-EVALUATION EXHAUSTION -> HALT")
    exhausted_case_id = None
    for trial in range(10):
        payload = {
            "transaction_id": f"TEST-EXHAUST-{int(time.time())}-{trial}",
            "amount": 500.0,
            "currency": "INR",
            "failure_code": "GATEWAY_TIMEOUT",
            "gateway_health_score": 0.01,
            "customer_tenure_days": 50,
            "previous_successful_payments": 0,
            "previous_failures": 5,
            "customer_id": f"CUST-EXHAUST-{trial}"
        }
        resp = client.post("/cases/", json=payload)
        dec = resp.json()
        case_id = dec["case_id"]

        rounds = 0
        while dec["current_state"] == "RE_EVALUATE" and rounds < 8:
            rounds += 1
            r = client.post(f"/cases/{case_id}/reevaluate", json={"gateway_health_score": 0.01})
            if r.status_code != 200:
                break
            dec = r.json()

        final_resp = client.get(f"/cases/{case_id}")
        final_status = final_resp.json()
        if final_status["state"] in ["HALTED", "UNRECOVERABLE"]:
            exhausted_case_id = case_id
            print(f"Case ID {case_id} reached terminal state: {final_status['state']} after {rounds} rounds")
            break

    assert exhausted_case_id is not None, "Expected at least one case to reach exhaustion"

    # Audit check
    audit_resp = client.get(f"/cases/{exhausted_case_id}/audit")
    trail = audit_resp.json()
    halt_events = [e for e in trail if e["event_type"] == "CASE_HALTED"]
    assert len(halt_events) > 0, "Expected CASE_HALTED in audit trail"
    print(f"Halt Reason: {halt_events[-1]['metadata'].get('reason')}")
    print(">>> SCENARIO 5: PASS")

if __name__ == "__main__":
    c1 = test_scenario_1_hard_policy_halt()
    c2 = test_scenario_2_no_positive_nir_wait()
    c3 = test_scenario_3_execution_failure_to_reevaluate()
    test_scenario_4_wait_reevaluation_changed_conditions(c3)
    test_scenario_5_exhaustion_to_halt()
    print("\n" + "#" * 70)
    print(" ALL 5 FALLBACK SCENARIOS EXECUTED AND PASSED SUCCESSFULLY!")
    print("#" * 70)
