from langchain_core.prompts import PromptTemplate
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_text_splitters import CharacterTextSplitter
from typing import List
import uuid
import os
import requests
from transformers import pipeline

import threading

# Define background thread loader for gen_pipeline to prevent uvicorn lockups and request blocks
gen_pipeline = None
gen_pipeline_loading = False

def load_model_background():
    global gen_pipeline, gen_pipeline_loading
    if gen_pipeline is not None or gen_pipeline_loading:
        return
    gen_pipeline_loading = True
    print("[AG-11] Starting background thread download of generative LLM (LaMini-GPT-124M)...")
    try:
        model = pipeline(
            "text-generation",
            model="MBZUAI/LaMini-GPT-124M"
        )
        gen_pipeline = model
        print("[AG-11] Generative LLM (LaMini-GPT-124M) successfully loaded in background!")
    except Exception as e:
        print(f"[AG-11] Background model download failed: {e}. Falling back to keyword QA extractor.")
        gen_pipeline = "FAILED"
    finally:
        gen_pipeline_loading = False

def trigger_background_download():
    t = threading.Thread(target=load_model_background, daemon=True)
    t.start()

# Start the background download instantly on module load (non-blocking)
trigger_background_download()

def get_gen_pipeline():
    if gen_pipeline == "FAILED":
        return None
    return gen_pipeline

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

def generate_generative_response(question: str, context: str) -> str:
    """
    RAG GENERATION ROUTER:
    Tries (1) Local Ollama [Qwen/Llama3], (2) Groq API, (3) local GPT2, or (4) extractor fallback
    to synthesize a conversational, thinking generative answer.
    """
    prompt = (
        f"You are a helpful estate inheritance assistant. Based ONLY on the owner instructions context below, "
        f"answer the question naturally in a conversational sentence. Do not repeat the question. "
        f"Do not assume, hallucinate, or make up any details. If the context does not explicitly contain the answer, "
        f"you must say exactly: 'No instructions regarding this topic were found in the owner's manual.'\n\n"
        f"Owner Instructions:\n{context}\n\n"
        f"Question: {question}\n\n"
        f"Answer:"
    )
    
    # 1. Try Local Ollama (e.g. running on localhost:11434)
    try:
        # Check if Ollama is listening by trying 'qwen' first
        res = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "qwen", "prompt": prompt, "stream": False},
            timeout=2.0
        )
        if res.status_code == 200:
            print("[AG-11] Generated response using local Ollama model (qwen)...")
            return res.json().get("response", "").strip()
    except Exception as e:
        print(f"[AG-11] Ollama 'qwen' check skipped/inactive: {e}")
        
    try:
        # Check if Ollama is listening with 'llama3'
        res = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "llama3", "prompt": prompt, "stream": False},
            timeout=2.0
        )
        if res.status_code == 200:
            print("[AG-11] Generated response using local Ollama model (llama3)...")
            return res.json().get("response", "").strip()
    except Exception:
        pass

    # 2. Try Groq API (if GROQ_API_KEY is configured in env)
    groq_api_key = os.getenv("GROQ_API_KEY")
    if groq_api_key:
        try:
            print("[AG-11] Generating response using Groq cloud API...")
            headers = {
                "Authorization": f"Bearer {groq_api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "llama3-8b-8192",
                "messages": [
                    {"role": "system", "content": "You are a helpful estate inheritance assistant. Answer based on the provided instructions context."},
                    {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
                ]
            }
            res = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=4.0)
            if res.status_code == 200:
                return res.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"[AG-11] Groq API call failed: {e}")

    # 3. Fallback: Try local self-contained LaMini-GPT model
    active_gen = get_gen_pipeline()
    if active_gen:
        try:
            print("[AG-11] Falling back to local LaMini-GPT instruction model...")
            prompt = (
                f"Context: {context}\n"
                f"Answer the question based ONLY on the context. If the answer is not in the context, write 'No instructions regarding this topic were found in the owner's manual.'. Do not make up anything.\n"
                f"Question: {question}\n"
                f"Answer: According to the owner's estate manual,"
            )
            res = active_gen(prompt, max_new_tokens=40, num_return_sequences=1, pad_token_id=50256)
            generated = res[0].get("generated_text", "")
            if prompt in generated:
                answer = generated.replace(prompt, "").strip()
                answer = "According to the owner's estate manual, " + answer
                if "\n" in answer:
                    answer = answer.split("\n")[0]
                return answer
        except Exception as e:
            print(f"[AG-11] Local LaMini-GPT generation failed: {e}")

    # 4. Final Fallback: Extractive QA matcher
    return local_qa_extractor(question, context)

class ExecutorGuidanceAgent:
    """
    AGENT 11: EXECUTOR GUIDANCE AGENT
    Uses LangChain, HuggingFace embeddings (all-MiniLM-L6-v2), ChromaDB vector store,
    and a generative router (Ollama/Groq/GPT2) to return conversational responses.
    """
    def __init__(self, instructions_text: str):
        self.instructions = instructions_text
        
        # Initialize real local semantic embeddings model
        print("[AG-11] Initializing local sentence-transformer embeddings (all-MiniLM-L6-v2)...")
        try:
            self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        except Exception as e:
            print(f"[AG-11] Error loading HuggingFaceEmbeddings: {e}. Fallback to basic embedding model.")
            class FallbackEmbeddings:
                def embed_documents(self, texts: List[str]):
                    return [[0.0] * 384 for _ in texts]
                def embed_query(self, text: str):
                    return [0.0] * 384
            self.embeddings = FallbackEmbeddings()
        
        # Setup Vector Store using ChromaDB
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
        
        # L2 distance threshold: if distance is too high (e.g. > 1.75), the query is semantically unrelated!
        if distance > 1.75:
            print("[AG-11] Query distance exceeds semantic relevance threshold. Filtering out as unrelated.")
            return {
                "answer": "No relevant instruction context found to answer that query.",
                "sources": []
            }
            
        context = doc.page_content
        
        # Generate answer using our Multi-Model RAG Router
        answer_text = generate_generative_response(question, context)
        
        # Wrap response in a conversational assistant persona
        if "No instructions regarding this topic" in answer_text or "No relevant instruction" in answer_text:
            conversational_response = (
                f"Hello, I am the Authorized Inheritance Assistant (Agent 11).\n\n"
                f"I searched the estate manual, but I could not find any instructions regarding this topic. "
                f"Please check if this topic is listed in the Covered Topics Index above, or try rephrasing your question."
            )
        else:
            conversational_response = (
                f"Hello! I am the Authorized Inheritance Assistant (Agent 11). "
                f"I have successfully scanned and decrypted the owner's instructions vault to retrieve the details you requested:\n\n"
                f"> \"{answer_text}\"\n\n"
                f"Please treat this information with extreme security and confidentiality. "
                f"If you need to find anything else, please refer to the Covered Topics Index above or ask me directly!"
            )
            
        return {
            "answer": conversational_response,
            "sources": [doc.metadata]
        }
