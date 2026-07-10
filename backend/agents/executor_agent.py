from langchain_core.prompts import PromptTemplate
from langchain_community.vectorstores import Chroma
from langchain_core.embeddings import Embeddings
from langchain_text_splitters import CharacterTextSplitter
from typing import List

class LocalSimpleEmbeddings(Embeddings):
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._embed(text) for text in texts]
        
    def embed_query(self, text: str) -> List[float]:
        return self._embed(text)
        
    def _embed(self, text: str) -> List[float]:
        vector = [0.0] * 128
        for i, char in enumerate(text[:128]):
            vector[i] = float(ord(char)) / 255.0
        return vector

class ExecutorGuidanceAgent:
    """
    AGENT 11: EXECUTOR GUIDANCE AGENT
    Uses LangChain, local offline embeddings, and ChromaDB vector store 
    to perform RAG (Retrieval-Augmented Generation) queries over estate instructions.
    """
    def __init__(self, instructions_text: str):
        self.instructions = instructions_text
        
        # 1. Initialize local offline embeddings
        print("[AG-11] Initializing offline local embeddings...")
        self.embeddings = LocalSimpleEmbeddings()
        
        # 2. Setup Vector Store using ChromaDB
        self._initialize_vector_store()
        
    def _initialize_vector_store(self):
        print("[AG-11] Splitting instruction manual into text chunks...")
        text_splitter = CharacterTextSplitter(chunk_size=200, chunk_overlap=20)
        chunks = text_splitter.split_text(self.instructions)
        
        print("[AG-11] Building ChromaDB vector database index...")
        self.vector_store = Chroma.from_texts(
            texts=chunks,
            embedding=self.embeddings,
            metadatas=[{"source": "owner_instructions"} for _ in chunks]
        )
        self.retriever = self.vector_store.as_retriever(search_kwargs={"k": 2})
        
    def query(self, question: str):
        print(f"[AG-11] Executing LangChain semantic lookup for question: '{question}'")
        docs = self.retriever.get_relevant_documents(question)
        
        if not docs:
            return {
                "answer": "No relevant instruction context found to answer that query.",
                "sources": []
            }
            
        context = "\n".join([doc.page_content for doc in docs])
        
        return {
            "answer": f"According to the owner's estate manual:\n{context}",
            "sources": [doc.metadata for doc in docs]
        }
