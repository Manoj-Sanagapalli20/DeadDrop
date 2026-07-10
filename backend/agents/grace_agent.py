from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from langchain_community.vectorstores import Chroma
from langchain_core.embeddings import Embeddings
import datetime

# Define a custom local embedding engine that runs offline under sandboxed environments
class LocalSimpleEmbeddings(Embeddings):
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._embed(text) for text in texts]
        
    def embed_query(self, text: str) -> List[float]:
        return self._embed(text)
        
    def _embed(self, text: str) -> List[float]:
        vector = [0.0] * 128
        # Fill vector deterministically based on character codes
        for i, char in enumerate(text[:128]):
            vector[i] = float(ord(char)) / 255.0
        return vector

# 1. Define State Schema for Agent 07 LangGraph
class GraceState(TypedDict):
    vault_id: str
    elapsed_days: int
    base_grace_days: int
    calculated_grace_days: int
    has_exception: bool
    logs: List[str]

# 2. Initialize ChromaDB vector store offline
print("[AG-07] Initializing ChromaDB vector store using local offline embeddings...")
embeddings = LocalSimpleEmbeddings()

exception_vector_db = Chroma.from_texts(
    texts=[
        "User travel exception: Out of country vacation to London, UK from July 8 to July 20, 2026. Extension approved.",
        "User travel exception: Business conference in Delhi, India from August 1 to August 5, 2026. Standard grace applies."
    ],
    embedding=embeddings,
    metadatas=[
        {"start_date": "2026-07-08", "end_date": "2026-07-20", "extra_grace": 12},
        {"start_date": "2026-08-01", "end_date": "2026-08-05", "extra_grace": 0}
    ]
)

# 3. Define LangGraph Node Functions
def fetch_travel_exceptions(state: GraceState) -> GraceState:
    logs = list(state.get("logs", []))
    logs.append("[AG-07] Node 1: Querying ChromaDB vector index for active travel registrations...")

    # Run local RAG query
    query_str = "active travel exceptions for July 2026"
    docs = exception_vector_db.similarity_search(query_str, k=1)
    
    has_exception = False
    extra_grace = 0
    
    if docs:
        doc = docs[0]
        has_exception = True
        extra_grace = doc.metadata.get("extra_grace", 0)
        logs.append(f"[AG-07] ChromaDB Hit: '{doc.page_content}' (Approved Extension: +{extra_grace} days grace).")
    else:
        logs.append("[AG-07] ChromaDB: No active exception vector profiles found for current date.")

    return {
        **state,
        "has_exception": has_exception,
        "calculated_grace_days": state["base_grace_days"] + extra_grace,
        "logs": logs
    }

def evaluate_grace_status(state: GraceState) -> GraceState:
    logs = list(state.get("logs", []))
    logs.append("[AG-07] Node 2: Calculating context-aware grace thresholds...")

    total_allowed = state["calculated_grace_days"]
    elapsed = state["elapsed_days"]
    
    logs.append(f"[AG-07] Missed check-in: elapsed {elapsed} days. Calculated grace limit: {total_allowed} days.")

    return {
        **state,
        "logs": logs
    }

# 4. Build LangGraph Workflow
workflow = StateGraph(GraceState)

workflow.add_node("query_chromadb", fetch_travel_exceptions)
workflow.add_node("evaluate_grace", evaluate_grace_status)

workflow.set_entry_point("query_chromadb")
workflow.add_edge("query_chromadb", "evaluate_grace")
workflow.add_edge("evaluate_grace", END)

grace_agent_graph = workflow.compile()


class ContextAwareGraceAgent:
    def evaluate_vault_grace(self, vault_id: str, elapsed_days: int) -> dict:
        initial_state = {
            "vault_id": vault_id,
            "elapsed_days": elapsed_days,
            "base_grace_days": 7,
            "calculated_grace_days": 7,
            "has_exception": False,
            "logs": ["[AG-07] Invoking Context-Aware Grace LangGraph sequence..."]
        }
        
        final_state = grace_agent_graph.invoke(initial_state)
        return {
            "grace_days": final_state["calculated_grace_days"],
            "has_exception": final_state["has_exception"],
            "logs": final_state["logs"]
        }
