from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from supabase import create_client, Client
import datetime
import os

# 1. Define State Schema for Agent 03
class FreshnessState(TypedDict):
    vault_id: str
    category: str
    created_at: str
    is_stale: bool
    logs: List[str]

# 2. Define LangGraph Node Functions
def fetch_vault_metadata(state: FreshnessState) -> FreshnessState:
    logs = list(state.get("logs", []))
    logs.append("[AG-03] Node 1: Running metadata lookup for vault freshness validation...")
    
    # Pre-loaded values (passed in state)
    category = state.get("category", "credentials")
    created_at = state.get("created_at", "")
    
    logs.append(f"[AG-03] Loaded metadata: Category = '{category}', Created At = '{created_at}'")
    return {
        "vault_id": state["vault_id"],
        "category": category,
        "created_at": created_at,
        "is_stale": False,
        "logs": logs
    }

def evaluate_stale_limits(state: FreshnessState) -> FreshnessState:
    logs = list(state.get("logs", []))
    logs.append("[AG-03] Node 2: Calculating elapsed time against classification thresholds...")
    
    created_at_str = state.get("created_at")
    category = state.get("category", "credentials")
    is_stale = False
    
    if not created_at_str:
        logs.append("[AG-03] Warning: Created timestamp is missing! Defaulting to fresh.")
        return {**state, "is_stale": False, "logs": logs}
        
    try:
        # Parse created_at ISO timestamp
        created_at = datetime.datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
        now = datetime.datetime.now(datetime.timezone.utc)
        elapsed_days = (now - created_at).days
        
        # Configure thresholds per category
        thresholds = {
            "credentials": 180,  # 6 months
            "financial": 365,    # 1 year
            "legal": 730,        # 2 years
            "memories": 999999   # Permanent
        }
        
        limit_days = thresholds.get(category, 180)
        logs.append(f"[AG-03] Elapsed age: {elapsed_days} days. Category limit: {limit_days} days.")
        
        if elapsed_days > limit_days:
            logs.append(f"[AG-03] Alert: Vault capsule age exceeds stale threshold!")
            is_stale = True
        else:
            logs.append("[AG-03] Capsule is clean and fresh.")
            
    except Exception as e:
        logs.append(f"[AG-03] Error parsing timestamp: {e}")
        
    return {**state, "is_stale": is_stale, "logs": logs}

def update_database_status(state: FreshnessState) -> FreshnessState:
    logs = list(state.get("logs", []))
    logs.append("[AG-03] Node 3: Syncing stale state metrics to Supabase vaults cache...")
    
    vault_id = state["vault_id"]
    is_stale = state["is_stale"]
    
    # Initialize Supabase client
    supabase_url = os.getenv("VITE_SUPABASE_URL")
    supabase_key = os.getenv("VITE_SUPABASE_ANON_KEY")
    
    if supabase_url and supabase_key:
        try:
            supabase: Client = create_client(supabase_url, supabase_key)
            # Update vaults table
            supabase.table("vaults").update({"is_stale": is_stale}).eq("id", vault_id).execute()
            logs.append(f"[AG-03] Database updated: is_stale set to {is_stale}")
        except Exception as e:
            logs.append(f"[AG-03] Failed database update: {e}")
    else:
        logs.append("[AG-03] Warning: Supabase client parameters missing inside env configuration.")
        
    return {**state, "logs": logs}


# 3. Compile LangGraph StateGraph workflow
workflow = StateGraph(FreshnessState)

# Add Nodes
workflow.add_node("fetch_metadata", fetch_vault_metadata)
workflow.add_node("evaluate_limits", evaluate_stale_limits)
workflow.add_node("update_db", update_database_status)

# Set Entrypoint and Links
workflow.set_entry_point("fetch_metadata")
workflow.add_edge("fetch_metadata", "evaluate_limits")
workflow.add_edge("evaluate_limits", "update_db")
workflow.add_edge("update_db", END)

# Final Compiled Agent Wrapper
class CapsuleFreshnessAgent:
    def __init__(self):
        self.graph = workflow.compile()
        
    def run_check(self, vault_id: str, category: str, created_at: str) -> dict:
        initial_state = {
            "vault_id": vault_id,
            "category": category,
            "created_at": created_at,
            "is_stale": False,
            "logs": []
        }
        return self.graph.invoke(initial_state)
