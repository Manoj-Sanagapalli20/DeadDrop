from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from transformers import pipeline
import time

# 1. Define Agent State schema in LangGraph
class AgentState(TypedDict):
    text: str
    verified: bool
    logs: List[str]
    message: str

# 2. Local Offline Sentiment Classifier for Sandboxed Fallback
class LocalSentimentClassifier:
    def __call__(self, text: str):
        normalized = text.lower()
        negative_words = ["danger", "stress", "hurt", "scared", "coerced", "force", "kill", "threat", "bad", "terrible", "worst", "unhappy"]
        positive_words = ["safe", "fine", "ok", "good", "well", "active", "normal", "healthy", "happy", "excellent"]
        
        neg_count = sum(1 for w in negative_words if w in normalized)
        pos_count = sum(1 for w in positive_words if w in normalized)
        
        if neg_count > pos_count:
            return [{"label": "NEGATIVE", "score": 0.92}]
        return [{"label": "POSITIVE", "score": 0.95}]

# Pre-load HuggingFace sentiment pipeline, fallback if sandbox blocks network
print("[AG-06] Pre-loading HuggingFace sentiment pipeline...")
try:
    classifier = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english", local_files_only=False)
except Exception as e:
    print(f"[AG-06] Sandbox connectivity blocks HuggingFace Hub: {e}. Switching to offline local sentiment classifier.")
    classifier = LocalSentimentClassifier()


# 3. Define LangGraph Node Functions
def check_coercion_keywords(state: AgentState) -> AgentState:
    text = state["text"].lower()
    logs = list(state.get("logs", []))
    logs.append("[AG-06] Node 1: Running keyword coercion check...")

    emergency_words = ["danger", "coerced", "hostage", "kill", "threat", "force", "help", "gun", "die", "dies", "dying", "death"]
    
    if any(word in text for word in emergency_words):
        logs.append("[AG-06] Emergency distress keyword detected!")
        return {
            "text": state["text"],
            "verified": False,
            "logs": logs,
            "message": "Emergency stress keywords flagged. Coercion suspected."
        }
    
    logs.append("[AG-06] No emergency keywords found.")
    return {
        "text": state["text"],
        "verified": True,
        "logs": logs,
        "message": "Passed keyword check."
    }

def check_huggingface_sentiment(state: AgentState) -> AgentState:
    if not state["verified"]:
        return state

    logs = list(state.get("logs", []))
    logs.append("[AG-06] Node 2: Executing HuggingFace sentiment model classification...")

    # Run classification
    result = classifier(state["text"])[0]
    logs.append(f"[AG-06] Sentiment check result: {result['label']} (Score: {result['score']:.3f})")

    if result['label'] == 'NEGATIVE' and result['score'] > 0.85:
        logs.append("[AG-06] High-probability negative stress sentiment detected.")
        return {
            "text": state["text"],
            "verified": False,
            "logs": logs,
            "message": "Classifier flags high-stress negative sentiment."
        }

    logs.append("[AG-06] Sentiment checked out nominal.")
    return {
        "text": state["text"],
        "verified": True,
        "logs": logs,
        "message": "Identity check verified. Wellness confirmed."
    }

# 4. Define Router conditional path
def routing_decision(state: AgentState) -> str:
    if not state["verified"]:
        return "lockdown"
    return "approve"

def lockdown_node(state: AgentState) -> AgentState:
    logs = list(state.get("logs", []))
    logs.append("[AG-06] Node: Lockdown engaged. Telemetry flags locked.")
    return {
        **state,
        "logs": logs,
        "message": "Verification Denied. Lock Engaged."
    }

def approve_node(state: AgentState) -> AgentState:
    logs = list(state.get("logs", []))
    logs.append("[AG-06] Node: Approval granted. Telemetry reset complete.")
    return {
        **state,
        "logs": logs,
        "message": "Verification Approved. Telemetry baseline synced."
    }


# 5. Build and Compile LangGraph State Graph
workflow = StateGraph(AgentState)

# Add Nodes
workflow.add_node("coercion_check", check_coercion_keywords)
workflow.add_node("sentiment_check", check_huggingface_sentiment)
workflow.add_node("lockdown", lockdown_node)
workflow.add_node("approve", approve_node)

# Set Entrance Point
workflow.set_entry_point("coercion_check")

# Define Edges
workflow.add_conditional_edges(
    "coercion_check",
    routing_decision,
    {
        "lockdown": "lockdown",
        "approve": "sentiment_check"
    }
)

workflow.add_conditional_edges(
    "sentiment_check",
    routing_decision,
    {
        "lockdown": "lockdown",
        "approve": "approve"
    }
)

workflow.add_edge("lockdown", END)
workflow.add_edge("approve", END)

wellness_graph = workflow.compile()


class WellnessVerificationAgent:
    def verify_response(self, text: str):
        initial_state = {
            "text": text,
            "verified": True,
            "logs": ["[AG-06] Invoking Wellness verification LangGraph workflow..."],
            "message": ""
        }
        
        final_state = wellness_graph.invoke(initial_state)
        return final_state
