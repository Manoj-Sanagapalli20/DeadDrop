from langchain_core.prompts import PromptTemplate
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_text_splitters import CharacterTextSplitter
from typing import List
import uuid
from transformers import pipeline

# Pre-load local offline Question Answering pipeline
print("[AG-11] Pre-loading local extractive QA pipeline...")
try:
    qa_pipeline = pipeline(
        "question-answering",
        model="distilbert-base-cased-distilled-squad",
        local_files_only=False
    )
except Exception as e:
    print(f"[AG-11] Sandbox offline: {e}. Switching to keyword context sentence extractor.")
    qa_pipeline = None

def local_qa_extractor(question: str, context: str) -> str:
    # Fallback sentence extractor if model is blocked by sandbox
    normalized_question = question.lower()
    sentences = []
    # Split text into sentences
    for block in context.split("\n"):
        for sentence in block.split("."):
            s_clean = sentence.strip()
            if s_clean:
                sentences.append(s_clean)
                
    keywords = [w.strip("?,.!") for w in normalized_question.split() if len(w) > 3]
    matches = []
    
    for s in sentences:
        if any(kw in s.lower() for kw in keywords):
            matches.append(s)
            
    if matches:
        return ". ".join(matches) + "."
    return "No instructions regarding this topic were found in the owner's manual."

class ExecutorGuidanceAgent:
    """
    AGENT 11: EXECUTOR GUIDANCE AGENT
    Uses LangChain, HuggingFace embeddings (all-MiniLM-L6-v2), ChromaDB vector store,
    and threshold scoring to isolate precise context answers.
    """
    def __init__(self, instructions_text: str):
        self.instructions = instructions_text
        
        # 1. Initialize real local semantic embeddings model
        print("[AG-11] Initializing local sentence-transformer embeddings (all-MiniLM-L6-v2)...")
        try:
            self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        except Exception as e:
            print(f"[AG-11] Error loading HuggingFaceEmbeddings: {e}. Fallback to basic embedding model.")
            # Basic fallback class if sentence-transformers crashes
            class FallbackEmbeddings:
                def embed_documents(self, texts: List[str]):
                    return [[0.0] * 384 for _ in texts]
                def embed_query(self, text: str):
                    return [0.0] * 384
            self.embeddings = FallbackEmbeddings()
        
        # 2. Setup Vector Store using ChromaDB
        self._initialize_vector_store()
        
    def _initialize_vector_store(self):
        print("[AG-11] Splitting instruction manual into text chunks...")
        text_splitter = CharacterTextSplitter(chunk_size=150, chunk_overlap=15)
        chunks = text_splitter.split_text(self.instructions)
        
        print("[AG-11] Building ChromaDB vector database index...")
        self.vector_store = Chroma.from_texts(
            texts=chunks,
            embedding=self.embeddings,
            collection_name=f"vault_{uuid.uuid4().hex}",
            metadatas=[{"source": "owner_instructions"} for _ in chunks]
        )
        
    def query(self, question: str):
        print(f"[AG-11] Executing local semantic lookup for question: '{question}'")
        try:
            # Retrieve document and L2 distance score from ChromaDB
            results = self.vector_store.similarity_search_with_score(question, k=1)
        except Exception as e:
            print(f"[AG-11] Search failed: {e}")
            results = []
            
        if not results:
            return {
                "answer": "No relevant instruction context found to answer that query.",
                "sources": []
            }
            
        doc, distance = results[0]
        print(f"[AG-11] Top document distance score: {distance:.4f}")
        
        # L2 distance threshold: if distance is too high (e.g. > 1.25), the query is semantically unrelated!
        if distance > 1.25:
            print("[AG-11] Query distance exceeds semantic relevance threshold. Filtering out as unrelated.")
            return {
                "answer": "No relevant instruction context found to answer that query.",
                "sources": []
            }
            
        context = doc.page_content
        
        # 3. Generate target response using Question Answering pipeline (True RAG)
        if qa_pipeline:
            try:
                res = qa_pipeline(question=question, context=context)
                extracted = res.get("answer", "").strip()
                if extracted and len(extracted) > 2:
                    # Match clean sentence in context containing the answer to output a complete sentence
                    sentences = [s.strip() for s in context.split("\n") if s.strip()]
                    match = ""
                    for s in sentences:
                        if extracted in s:
                            match = s
                            break
                    answer_text = match if match else extracted
                else:
                    answer_text = local_qa_extractor(question, context)
            except Exception as e:
                print(f"[AG-11] QA model run failed: {e}. Falling back.")
                answer_text = local_qa_extractor(question, context)
        else:
            answer_text = local_qa_extractor(question, context)
            
        return {
            "answer": f"According to the owner's estate manual:\n{answer_text}",
            "sources": [doc.metadata]
        }
