import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ChevronRight, CornerDownRight, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import FilmGrain from '../components/FilmGrain';
import Logo from '../components/Logo';

const MOCK_ANSWERS = [
  { keywords: ['sbi', 'locker', 'bank'], text: "The SBI bank locker keys are located in the drawer under the master bedroom safe. The safe combination is 28-10-94. Share this with Priya Sharma." },
  { keywords: ['coinbase', 'crypto', 'wallet'], text: "The Coinbase crypto hardware Ledger wallet is in the study room vault (Code: 8520). The 24-word recovery seed phrase is written in page 12 of the physical blue book on the shelf." },
  { keywords: ['property', 'will', 'lawyer'], text: "The local property executor deed is held at the office of Sharma Associates, Mumbai. Call +91 22 555-0192 to file the release claim." }
];

export default function TrusteeGuidance() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setAnswer('');
    
    setTimeout(() => {
      const match = MOCK_ANSWERS.find((ans) => 
        ans.keywords.some((k) => query.toLowerCase().includes(k))
      );
      
      if (match) {
        setAnswer(match.text);
      } else {
        setAnswer("No direct matches found in instruction metadata. Verify search queries: try 'SBI bank locker' or 'crypto wallet'.");
      }
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="relative min-h-screen bg-[#030304] text-textWhite font-sans overflow-hidden flex flex-col justify-between">
      <FilmGrain />

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#030304]/75 backdrop-blur-md border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center shadow-lg">
        <Logo />
        <Link to="/trustee/decrypt" className="text-xs text-textMuted hover:text-textWhite transition-colors font-semibold">
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
            Vault release threshold complete. Query Agent 11 to search instructions, bank lockers, crypto seeds, and legal contacts.
          </p>
        </div>

        <div className="bg-[#08080B]/80 border border-white/5 rounded-2xl p-6 glass-panel flex flex-col gap-5 text-left relative overflow-hidden glint-effect">
          
          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-3 relative z-10">
            <input 
              type="text"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="E.g., Where is the SBI bank locker key?..."
              className="flex-grow bg-[#030304]/60 border border-white/5 focus:border-white/30 focus:ring-0 rounded-lg p-3 text-xs outline-none text-textWhite transition-all duration-300"
            />
            <button 
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

          {/* Answer terminal widget */}
          <div className="bg-[#050508]/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-[#0C0D1A]/80 border-b border-white/5 px-4 py-2.5 flex items-center justify-between text-[10px] text-textMuted font-semibold">
              <span>Agent 11 Context Search</span>
              <span>Synced</span>
            </div>
            
            <div className="p-4 text-[11px] text-[#A1A1AA] min-h-[140px] flex flex-col justify-center bg-black/45">
              {loading ? (
                <div className="flex items-center justify-center gap-2 text-textMuted animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Searching encrypted metadata embeddings...</span>
                </div>
              ) : answer ? (
                <div className="flex flex-col gap-3 text-left">
                  <div className="flex items-start gap-1">
                    <CornerDownRight className="w-3.5 h-3.5 text-white flex-shrink-0 mt-0.5" />
                    <span className="text-[#E4E4E7] leading-relaxed font-light">{answer}</span>
                  </div>
                </div>
              ) : (
                <span className="text-textMuted uppercase animate-pulse">
                  Awaiting query input: search instructions for 'SBI bank', 'crypto wallet', or 'property will'...
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
          <span>DEADDROP INSTRUCTION ENGINE</span>
          <span>© 2026 SERVICES.</span>
        </div>
      </footer>

    </div>
  );
}
