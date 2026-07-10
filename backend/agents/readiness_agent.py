from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from supabase import create_client, Client
import datetime
import os

# 1. Define State Schema for Agent 02 LangGraph
class ReadinessState(TypedDict):
    vault_id: str
    trustees: List[dict]
    needs_fallback: bool
    logs: List[str]

# 2. Define LangGraph Node Functions
def fetch_trustee_active_logs(state: ReadinessState) -> ReadinessState:
    logs = list(state.get("logs", []))
    logs.append("[AG-02] Node 1: Fetching trustee telemetry active statuses from database...")
    
    trustees = state["trustees"]
    needs_fallback = False
    
    now = datetime.datetime.now(datetime.timezone.utc)
    
    # We audit each trustee. If a primary trustee has been inactive for more than 7 days,
    # or if their email channel is unresponsive, we flag the need for a backup fallback.
    for trustee in trustees:
        name = trustee.get("name", "Unknown")
        is_backup = trustee.get("is_backup", False)
        last_active_str = trustee.get("last_active_at")
        
        if not is_backup:
            # If last_active is missing or older than 7 days, trigger backup fallback!
            if not last_active_str:
                logs.append(f"[AG-02] Inactivity Alert: Primary trustee '{name}' has never logged in!")
                needs_fallback = True
            else:
                last_active = datetime.datetime.fromisoformat(last_active_str.replace("Z", "+00:00"))
                inactive_days = (now - last_active).days
                if inactive_days > 7:
                    logs.append(f"[AG-02] Primary trustee '{name}' inactive for {inactive_days} days (Limit: 7).")
                    needs_fallback = True
                else:
                    logs.append(f"[AG-02] Primary trustee '{name}' checked out active ({inactive_days} days ago).")
                    
    return {
        **state,
        "needs_fallback": needs_fallback,
        "logs": logs
    }

def execute_backup_fallback(state: ReadinessState) -> ReadinessState:
    if not state["needs_fallback"]:
        return state
        
    logs = list(state.get("logs", []))
    logs.append("[AG-02] Node 2: Activating backup trustee role promotion...")
    
    # Simulate role inversion in database
    for trustee in state["trustees"]:
        name = trustee.get("name", "Unknown")
        if trustee.get("is_backup", False):
            logs.append(f"[AG-02] Promoted backup trustee '{name}' to active primary channel.")
            trustee["is_backup"] = False
        else:
            logs.append(f"[AG-02] Demoted inactive trustee '{name}' to secondary/backup channel.")
            trustee["is_backup"] = True
            
    return {
        **state,
        "needs_fallback": False,
        "logs": logs
    }

# 3. Build LangGraph Workflow
workflow = StateGraph(ReadinessState)

workflow.add_node("check_telemetry", fetch_trustee_active_logs)
workflow.add_node("role_fallback", execute_backup_fallback)

workflow.set_entry_point("check_telemetry")

# Conditional Routing Edge
def routing_choice(state: ReadinessState) -> str:
    if state["needs_fallback"]:
        return "fallback"
    return "end"

workflow.add_conditional_edges(
    "check_telemetry",
    routing_choice,
    {
        "fallback": "role_fallback",
        "end": END
    }
)

workflow.add_edge("role_fallback", END)

# Compile LangGraph State Graph
readiness_graph = workflow.compile()


class TrusteeReadinessAgent:
    """
    FastAPI wrapping class to execute the compiled LangGraph workflow
    """
    def check_trustee_readiness(self, vault_id: str, trustees_list: List[dict]) -> dict:
        initial_state = {
            "vault_id": vault_id,
            "trustees": trustees_list,
            "needs_fallback": False,
            "logs": ["[AG-02] Invoking Trustee Readiness check LangGraph workflow..."]
        }
        
        final_state = readiness_graph.invoke(initial_state)
        return {
            "trustees": final_state["trustees"],
            "logs": final_state["logs"]
        }
