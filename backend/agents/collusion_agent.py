from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from supabase import create_client, Client
import datetime
import os

# 1. Define State Schema for Agent 05
class CollusionState(TypedDict):
    vault_id: str
    access_logs: List[dict]
    is_collusion_suspected: bool
    logs: List[str]

# 2. Define LangGraph Node Functions
def fetch_access_logs(state: CollusionState) -> CollusionState:
    logs = list(state.get("logs", []))
    logs.append("[AG-05] Node 1: Querying trustee console access log entries from Supabase...")
    
    vault_id = state["vault_id"]
    access_logs = []
    
    supabase_url = os.getenv("VITE_SUPABASE_URL")
    supabase_key = os.getenv("VITE_SUPABASE_ANON_KEY")
    
    if supabase_url and supabase_key:
        try:
            supabase: Client = create_client(supabase_url, supabase_key)
            # Query access logs sorted by time
            response = supabase.table("trustee_access_logs") \
                .select("*") \
                .eq("vault_id", vault_id) \
                .order("accessed_at", desc=True) \
                .execute()
                
            if response.data:
                access_logs = response.data
                logs.append(f"[AG-05] Loaded {len(access_logs)} access log entries.")
            else:
                logs.append("[AG-05] No trustee access log entries found.")
        except Exception as e:
            logs.append(f"[AG-05] Supabase logs fetch failed: {e}")
    else:
        logs.append("[AG-05] Warning: Supabase client parameters missing.")
        
    return {
        "vault_id": vault_id,
        "access_logs": access_logs,
        "is_collusion_suspected": False,
        "logs": logs
    }

def analyze_coordination_patterns(state: CollusionState) -> CollusionState:
    logs = list(state.get("logs", []))
    logs.append("[AG-05] Node 2: Auditing log parameters for collusion markers...")
    
    access_logs = state["access_logs"]
    is_collusion_suspected = False
    
    if len(access_logs) < 2:
        logs.append("[AG-05] Insufficient logins to evaluate coordination. Vault is secure.")
        return {**state, "is_collusion_suspected": False, "logs": logs}
        
    try:
        # Compare log entries chronologically to detect anomalies
        for i in range(len(access_logs)):
            for j in range(i + 1, len(access_logs)):
                log1 = access_logs[i]
                log2 = access_logs[j]
                
                # Check 1: Different trustees logging in from SAME IP within 2 minutes
                if log1["trustee_id"] != log2["trustee_id"] and log1["ip_address"] == log2["ip_address"]:
                    t1_time = datetime.datetime.fromisoformat(log1["accessed_at"].replace("Z", "+00:00"))
                    t2_time = datetime.datetime.fromisoformat(log2["accessed_at"].replace("Z", "+00:00"))
                    time_diff = abs((t1_time - t2_time).total_seconds())
                    
                    if time_diff < 120:  # 2 minutes
                        logs.append(f"[AG-05] COLLUSION DETECTED: Simultaneous login from IP {log1['ip_address']} within {time_diff}s!")
                        is_collusion_suspected = True
                        break
                        
                # Check 2: Different IPs logging in within 10 seconds of each other (implies bot coordination)
                if log1["ip_address"] != log2["ip_address"]:
                    t1_time = datetime.datetime.fromisoformat(log1["accessed_at"].replace("Z", "+00:00"))
                    t2_time = datetime.datetime.fromisoformat(log2["accessed_at"].replace("Z", "+00:00"))
                    time_diff = abs((t1_time - t2_time).total_seconds())
                    
                    if time_diff < 10:  # 10 seconds
                        logs.append(f"[AG-05] COLLUSION DETECTED: Rapid access from different IPs ({log1['ip_address']} vs {log2['ip_address']}) in {time_diff}s!")
                        is_collusion_suspected = True
                        break
            if is_collusion_suspected:
                break
                
        if not is_collusion_suspected:
            logs.append("[AG-05] Access log patterns verified nominal.")
            
    except Exception as e:
        logs.append(f"[AG-05] Analysis execution error: {e}")
        
    return {**state, "is_collusion_suspected": is_collusion_suspected, "logs": logs}

def freeze_suspect_vault(state: CollusionState) -> CollusionState:
    logs = list(state.get("logs", []))
    logs.append("[AG-05] Node 3: Applying security freeze policies on target vault...")
    
    vault_id = state["vault_id"]
    is_collusion_suspected = state["is_collusion_suspected"]
    
    if is_collusion_suspected:
        supabase_url = os.getenv("VITE_SUPABASE_URL")
        supabase_key = os.getenv("VITE_SUPABASE_ANON_KEY")
        
        if supabase_url and supabase_key:
            try:
                supabase = create_client(supabase_url, supabase_key)
                
                # Freeze vault by corrupting IV and marking safety score as -1
                supabase.table("vaults").update({
                    "iv": "FROZEN_COLLUSION",
                    "safety_score": -1
                }).eq("id", vault_id).execute()
                
                logs.append("[AG-05] Security Lockdown Activated: Vault IV scrambled to block key submissions.")
            except Exception as e:
                logs.append(f"[AG-05] Security lockdown update failed: {e}")
        else:
            logs.append("[AG-05] DB credentials missing. Lockdown action skipped.")
    else:
        logs.append("[AG-05] Vault remains un-frozen.")
        
    return {**state, "logs": logs}


# 3. Compile LangGraph StateGraph workflow
workflow = StateGraph(CollusionState)

# Add Nodes
workflow.add_node("fetch_logs", fetch_access_logs)
workflow.add_node("analyze_patterns", analyze_coordination_patterns)
workflow.add_node("freeze_vault", freeze_suspect_vault)

# Set Entrypoint and Links
workflow.set_entry_point("fetch_logs")
workflow.add_edge("fetch_logs", "analyze_patterns")
workflow.add_edge("analyze_patterns", "freeze_vault")
workflow.add_edge("freeze_vault", END)

# Final Compiled Agent Wrapper
class AntiCollusionAgent:
    def __init__(self):
        self.graph = workflow.compile()
        
    def run_check(self, vault_id: str) -> dict:
        initial_state = {
            "vault_id": vault_id,
            "access_logs": [],
            "is_collusion_suspected": False,
            "logs": []
        }
        return self.graph.invoke(initial_state)
