import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agents.wellness_agent import WellnessVerificationAgent
from agents.executor_agent import ExecutorGuidanceAgent
from agents.cron_sweeper import CronSweeperAgent
import os
import time
import threading

app = FastAPI(title="DeadDrop AI Agentic Backend Server", version="1.0.0")

# Allow React frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Wellness Agent (HuggingFace LangGraph)
wellness_agent = WellnessVerificationAgent()

class CheckinRequest(BaseModel):
    text: str

class QueryRequest(BaseModel):
    instructions: str
    query: str

@app.on_event("startup")
def start_background_sweeper():
    """
    On startup, launch the Agent 07 Context-Aware Grace countdown sweeper 
    in a background daemon thread to monitor Supabase DB timers automatically.
    """
    supabase_url = os.environ.get("VITE_SUPABASE_URL", "https://bfbhniaputlxghcdrovu.supabase.co")
    supabase_key = os.environ.get("VITE_SUPABASE_ANON_KEY", "sb_publishable_WQSdJeqz2mvmBnwDLbVBHA_sTXA7-zr")
    
    if supabase_url and supabase_key:
        try:
            sweeper = CronSweeperAgent(supabase_url, supabase_key)
            
            def sweeper_loop():
                while True:
                    try:
                        sweeper.sweep_vault_timers()
                    except Exception as loop_err:
                        print(f"[Sweeper Thread] Error: {loop_err}")
                    time.sleep(30) # Audit database every 30 seconds for dynamic testing
            
            thread = threading.Thread(target=sweeper_loop, daemon=True)
            thread.start()
            print("[Backend Startup] Background CronSweeperAgent (Agent 07) launched in daemon thread.")
        except Exception as e:
            print(f"[Backend Startup] Failed to initialize background sweeper: {e}")
    else:
        print("[Backend Startup] Supabase keys missing. Background sweeper inactive.")

@app.get("/")
def read_root():
    return {"status": "ONLINE", "agents": "FastAPI + LangChain + LangGraph + ChromaDB + HuggingFace"}

@app.post("/api/checkin")
def checkin_text_analysis(request: CheckinRequest):
    """
    Agent 06: Wellness Verification Agent Endpoint.
    Analyzes stress markers using HuggingFace model.
    """
    try:
      result = wellness_agent.verify_response(request.text)
      return result
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/guidance")
def estate_guidance_query(request: QueryRequest):
    """
    Agent 11: Executor Guidance RAG Endpoint.
    Loads instructions into ChromaDB, processes query through LangChain QA.
    """
    try:
        if not request.instructions.strip():
            return {"answer": "No estate instructions have been configured by the owner."}
            
        rag_agent = ExecutorGuidanceAgent(request.instructions)
        result = rag_agent.query(request.query)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
