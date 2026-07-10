from supabase import create_client, Client
from agents.grace_agent import ContextAwareGraceAgent
from agents.readiness_agent import TrusteeReadinessAgent
from agents.escalation_agent import MultiChannelEscalationAgent
import datetime
import time
import os

class CronSweeperAgent:
    """
    AGENT 07 & 08 SWEEPER
    Monitors vault timers in the background and evaluates missed check-ins.
    Integrates Agent 07 (Context-Aware Grace Agent via LangGraph + ChromaDB),
    Agent 02 (Trustee Readiness via LangGraph), and Agent 08 (Multi-Channel Escalation).
    """
    def __init__(self, supabase_url: str, supabase_key: str):
        print("[AG-07] Initializing background vault timer monitor...")
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.grace_agent = ContextAwareGraceAgent()
        self.readiness_agent = TrusteeReadinessAgent()
        self.escalation_agent = MultiChannelEscalationAgent()
        
    def sweep_vault_timers(self):
        print(f"[AG-07] [{datetime.datetime.now().isoformat()}] Running database timer audit sweep...")
        
        try:
            # 1. Fetch all active vaults from Supabase
            response = self.supabase.table("vaults").select("*").execute()
            vaults = response.data
            
            if not vaults:
                print("[AG-07] No vaults configured in database. Sweep complete.")
                return
                
            for vault in vaults:
                vault_id = vault["id"]
                name = vault["name"]
                timer_days = vault["timer_days"]
                last_checkin_str = vault["last_checkin_at"]
                
                # Fetch registered trustees for this vault to run Agent 02 checks
                trustee_response = self.supabase.table("trustees").select("*").eq("vault_id", vault_id).execute()
                trustees = trustee_response.data or []
                
                # Parse timestamps
                last_checkin = datetime.datetime.fromisoformat(last_checkin_str.replace("Z", "+00:00"))
                now = datetime.datetime.now(datetime.timezone.utc)
                
                # Calculate elapsed time
                elapsed_time = now - last_checkin
                elapsed_days = elapsed_time.days
                
                print(f"[AG-07] Auditing Vault '{name}' ({vault_id}). Elapsed time since check-in: {elapsed_days} days.")
                
                # 2. Run Agent 02 Trustee Readiness audits
                if trustees:
                    readiness_res = self.readiness_agent.check_trustee_readiness(vault_id, trustees)
                    for log in readiness_res["logs"]:
                        print(log)
                
                # 3. Audit check-in timer
                if elapsed_days >= timer_days:
                    # Execute Agent 07 LangGraph + ChromaDB sequence to get personalized grace window
                    grace_result = self.grace_agent.evaluate_vault_grace(vault_id, elapsed_days)
                    allowed_grace = grace_result["grace_days"]
                    
                    for log in grace_result["logs"]:
                        print(log)
                    
                    # If grace period has also expired:
                    if elapsed_days >= (timer_days + allowed_grace):
                        print(f"[AG-07] CRITICAL: Vault '{name}' missed check-in and expired calculated {allowed_grace}-day grace window!")
                        
                        # Trigger Agent 08 (Multi-Channel Escalation)
                        self.escalation_agent.trigger_vault_compromised_alert(
                            owner_name="Vault Owner",
                            vault_name=name,
                            trustees=trustees
                        )
                        
                        # Set safety score to 0
                        self.supabase.table("vaults").update({"safety_score": 0}).eq("id", vault_id).execute()
                    else:
                        remaining_grace = (timer_days + allowed_grace) - elapsed_days
                        print(f"[AG-07] WARNING: Vault '{name}' in active GRACE period. Remaining: {remaining_grace} days.")
                        # Set safety score to 50
                        self.supabase.table("vaults").update({"safety_score": 50}).eq("id", vault_id).execute()
                else:
                    days_left = timer_days - elapsed_days
                    print(f"[AG-07] Vault '{name}' status: NOMINAL. {days_left} days remaining.")
                    
        except Exception as e:
            print(f"[AG-07] Error running database sweep: {str(e)}")

def run_continuous_sweeper(supabase_url: str, supabase_key: str, interval_seconds: int = 3600):
    sweeper = CronSweeperAgent(supabase_url, supabase_key)
    print(f"[AG-07] Starting continuous daemon sweep loop...")
    while True:
        sweeper.sweep_vault_timers()
        time.sleep(interval_seconds)
