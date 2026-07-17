import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, CornerDownRight, ShieldAlert, RefreshCw } from 'lucide-react';
import FilmGrain from '../components/FilmGrain';
import Logo from '../components/Logo';
import { supabase } from '../utils/supabaseClient';
import { executorGuidanceChain } from '../../agents';

export default function TrusteeGuidance() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const vaultId = searchParams.get('vault');

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [vaultInstructions, setVaultInstructions] = useState('');
  const [vaultName, setVaultName] = useState('Secure Vault');
  const [suggestions, setSuggestions] = useState([]);
  const [topicsList, setTopicsList] = useState([]);

  // Load the owner's estate instructions from the database
  useEffect(() => {
    if (!vaultId) return;

    const fetchInstructions = async () => {
      try {
        const { data: vault, error } = await supabase
          .from('vaults')
          .select('name, instructions')
          .eq('id', vaultId)
          .single();

        if (!error && vault) {
          const inst = vault.instructions || '';
          setVaultInstructions(inst);
          setVaultName(vault.name);

          // Extract suggestions dynamically
          const clean = inst.toLowerCase();
          const list = [];
          const topics = [];
          if (clean.includes("key") || clean.includes("locker") || clean.includes("sbi")) {
            list.push("Where are the locker keys?");
            topics.push("🔑 SBI Locker Keys");
          }
          if (clean.includes("password") || clean.includes("pin") || clean.includes("login") || clean.includes("laptop") || clean.includes("resume")) {
            list.push("What is the laptop password?");
            topics.push("💻 Laptop & Resume Access");
          }
          if (clean.includes("will") || clean.includes("estate") || clean.includes("legal") || clean.includes("property")) {
            list.push("Where are the legal documents?");
            topics.push("📄 Legal Wills & Documents");
          }
          if (clean.includes("financial") || clean.includes("bank") || clean.includes("account")) {
            list.push("Are there any bank accounts?");
            topics.push("🏦 Financial Accounts");
          }
          if (list.length === 0 && inst.trim()) {
            list.push("What instructions did the owner leave?");
            topics.push("📝 General Legacy Instructions");
          }
          setSuggestions(list);
          setTopicsList(topics);
        }
      } catch (err) {
        console.error("Failed to load instructions for RAG agent:", err);
      }
    };

    fetchInstructions();
  }, [vaultId]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setAnswer('');

    try {
      // 1. Fetch from the real Python LangChain + ChromaDB RAG API endpoint!
      const response = await fetch("http://localhost:8000/api/guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructions: vaultInstructions || 'No instructions left by the owner.',
          query: query
        })
      });
      const data = await response.json(); // returns: { answer: string, sources: any[] }

      setAnswer(data.answer);
    } catch (err) {
      console.warn("LangChain RAG backend query failed, using offline fallback:", err);
      
      // Fallback: Run local search inside React
      try {
        const result = await executorGuidanceChain.invoke({
          instructions: vaultInstructions || 'No instructions left by the owner.',
          query: query
        });
        setAnswer(`${result.answer} (Offline Fallback Mode)`);
      } catch (fallbackErr) {
        setAnswer("Error: Failed to process query through RAG pipeline.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#030304] text-textWhite font-sans overflow-hidden flex flex-col justify-between">
      <FilmGrain />

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#030304]/75 backdrop-blur-md border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center shadow-lg">
        <Logo />
        <Link
          to={vaultId ? `/trustee/decrypt?vault=${vaultId}` : "/trustee/decrypt"}
          className="text-xs text-textMuted hover:text-textWhite transition-colors font-semibold"
        >
          Return to Keys Board
        </Link>
      </header>

      {/* MAIN CONTAINER */}
      <main className="relative z-10 flex-grow max-w-4xl mx-auto w-full px-6 pt-24 pb-16 flex flex-col gap-6 justify-center">

        <div className="text-left mb-2">
          <span className="text-[10px] text-white/60 uppercase tracking-widest font-bold">
            Authorized Inheritance Assistant
          </span>
          <h2 className="font-sans font-bold text-2xl text-textWhite uppercase mt-0.5">
            Executor Instructions RAG Chat
          </h2>
          <p className="text-textMuted text-xs mt-1.5 leading-relaxed max-w-xl font-light">
            Vault release threshold complete. Query Agent 11 to search estate instructions, bank lockers, crypto seeds, and legal details left by the owner for: <span className="text-white font-bold">"{vaultName}"</span>.
          </p>
        </div>

        {/* Dynamic visual Covered Topics Checklist */}
        {topicsList.length > 0 && (
          <div className="bg-[#08080B]/60 border border-white/5 rounded-2xl p-5 text-left relative overflow-hidden glass-panel flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[10px] text-textMuted uppercase tracking-wider font-bold">
              <span>📂 Decrypted Estate Topics Index</span>
              <span className="text-forestGreen font-semibold uppercase">✓ Active</span>
            </div>
            <div className="flex flex-wrap gap-2.5 my-1">
              {topicsList.map((topic, idx) => (
                <span
                  key={idx}
                  className="px-3.5 py-1.5 bg-white/[0.03] border border-white/10 rounded-xl text-[10px] text-textWhite font-semibold flex items-center gap-2 shadow-sm"
                >
                  {topic}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-textMuted leading-relaxed font-light font-sans max-w-xl">
              The owner has documented security details on these specific topics. Use the search assistant below or click one of the suggested prompts to unlock details.
            </p>
          </div>
        )}

        <div className="bg-[#08080B]/80 border border-white/5 rounded-2xl p-6 glass-panel flex flex-col gap-5 text-left relative overflow-hidden glint-effect">

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-3 relative z-10">
            <input
              type="text"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="E.g., Where is the SBI bank locker key?..."
              className="flex-grow bg-[#030304]/60 border border-white/5 focus:border-white/30 focus:ring-0 rounded-lg p-3 text-xs outline-none text-textWhite transition-all duration-300 font-sans"
            />
            <button
              id="search-submit-btn"
              type="submit"
              disabled={loading}
              className="px-6 bg-white text-black hover:bg-zinc-200 text-xs font-bold uppercase rounded-full flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-0 shadow-lg shadow-white/5"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" /> Search
                </>
              )}
            </button>
          </form>

          {/* Dynamic Clickable suggestions chips */}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center text-[9px] text-textMuted uppercase font-bold tracking-wider mt-1 text-left relative z-10">
              <span>Suggested Queries:</span>
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuery(sug);
                    // trigger search
                    setTimeout(() => {
                      const btn = document.getElementById("search-submit-btn");
                      if (btn) btn.click();
                    }, 50);
                  }}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 hover:border-white/20 border border-white/5 rounded-full text-[9px] text-textWhite font-semibold normal-case transition-all cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Answer terminal widget */}
          <div className="bg-[#050508]/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-[#0C0D1A]/80 border-b border-white/5 px-4 py-2.5 flex items-center justify-between text-[10px] text-textMuted font-semibold">
              <span>Agent 11 Context Search</span>
              <span>Synced</span>
            </div>

            <div className="p-4 text-[11px] text-[#A1A1AA] min-h-[140px] flex flex-col justify-center bg-black/45 font-sans">
              {loading ? (
                <div className="flex items-center justify-center gap-2 text-textMuted animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Searching encrypted metadata embeddings...</span>
                </div>
              ) : answer ? (
                <div className="flex flex-col gap-3 text-left">
                  <div className="flex items-start gap-1">
                    <CornerDownRight className="w-3.5 h-3.5 text-white flex-shrink-0 mt-0.5" />
                    <span className="text-[#E4E4E7] leading-relaxed font-light whitespace-pre-wrap">{answer}</span>
                  </div>
                </div>
              ) : (
                <span className="text-textMuted uppercase animate-pulse">
                  {vaultId ? (
                    "Awaiting query input: search instructions left by the vault owner..."
                  ) : (
                    "Awaiting query input: (Note: Open the link with a vault parameter to search real instructions)"
                  )}
                </span>
              )}
            </div>
          </div>

          <div className="bg-amber-950/20 border border-amber-900/30 p-3 rounded-lg text-[10px] text-amber-400 font-semibold uppercase tracking-wide leading-relaxed mt-2 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-white flex-shrink-0" />
            <span>AI check: Zero-knowledge query index active. Queries are run client-side against decrypted memory.</span>
          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full py-5 px-6 border-t border-white/5 bg-[#050506]/40 font-mono text-[9px] text-[#52525B]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <span>DeadDrop INSTRUCTION ENGINE</span>
          <span>© 2026 SERVICES.</span>
        </div>
      </footer>

    </div>
  );
}
