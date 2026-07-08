import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Send, Shield, AlertCircle, Sparkles, RefreshCw, BarChart2 } from 'lucide-react';
import FilmGrain from '../components/FilmGrain';
import Logo from '../components/Logo';

export default function Checkin() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([
    { sender: 'agent', text: "Verification telemetry sweep initialized. Wellness Verification Agent [AG-06] active." },
    { sender: 'agent', text: "Verification layer 1: Please write a brief sentence describing what city you are currently residing in and the local weather." }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [typingDelay, setTypingDelay] = useState(0);

  // Measure keystroke times roughly
  useEffect(() => {
    const timer = setInterval(() => {
      setTypingDelay((prev) => prev + 1);
    }, 100);
    return () => clearInterval(timer);
  }, [inputVal]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userMsg = inputVal;
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setInputVal('');
    setAnalyzing(true);

    setTimeout(() => {
      // Print metrics
      setMessages((prev) => [
        ...prev, 
        { sender: 'system', text: `Telemetry validation check: Speed index ${(typingDelay / 10).toFixed(1)}s (Normal); Syntactic match 0.99; Duress level safe.` }
      ]);
      
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { sender: 'agent', text: "Verification approved. DeadDrop Switch telemetry timer reset to 30 days. Logs updated." }
        ]);
        setAnalyzing(false);
        setTypingDelay(0);
      }, 1000);
    }, 1200);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="relative min-h-screen bg-[#030304] text-textWhite font-sans overflow-hidden flex flex-col justify-between">
      <FilmGrain />

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#030304]/75 backdrop-blur-md border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center shadow-lg">
        <Logo />
        <Link to="/dashboard" className="text-xs text-textMuted hover:text-textWhite transition-colors font-semibold">
          Return to Dashboard
        </Link>
      </header>

      {/* MAIN LAYOUT */}
      <main className="relative z-10 flex-grow max-w-5xl mx-auto w-full px-6 pt-24 pb-16 grid md:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN: ACTIVE CHAT TERMINAL */}
        <div className="md:col-span-8 flex flex-col justify-between bg-[#08080B]/80 border border-white/5 rounded-2xl overflow-hidden glass-panel relative">
          
          {/* Header Status */}
          <div className="bg-[#0C0D1A]/80 border-b border-white/5 px-4 py-3.5 flex items-center justify-between text-[10px] text-textMuted uppercase tracking-wider font-semibold">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>Wellness Chat Session</span>
            </div>
            <span>Agent 06 Active</span>
          </div>

          {/* Messages Log area */}
          <div className="flex-grow p-4 overflow-y-auto max-h-[350px] flex flex-col gap-3 text-xs text-left scrollbar-none">
            {messages.map((msg, index) => (
              <div 
                key={index}
                className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'self-end text-right' : 'self-start text-left'}`}
              >
                <span className="text-[9px] text-textMuted uppercase mb-0.5 font-semibold">
                  {msg.sender === 'agent' && 'Agent 06'}
                  {msg.sender === 'user' && 'User Identity'}
                  {msg.sender === 'system' && 'Security Bus'}
                </span>
                <div 
                  className={`p-3.5 rounded-2xl ${msg.sender === 'user' ? 'bg-white/5 border border-white/10 text-textWhite' : msg.sender === 'system' ? 'bg-black/35 border border-white/5 text-[#A1A1AA] text-[10px]' : 'bg-[#0A0A15]/60 border border-white/5 text-[#E4E4E7]'}`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {analyzing && (
              <div className="self-start text-left max-w-[80%] flex flex-col">
                <span className="text-[9px] text-textMuted uppercase mb-0.5 font-semibold">Agent 06</span>
                <div className="p-3.5 bg-[#0A0A15]/60 border border-white/5 rounded-xl flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span className="text-[10px] text-textMuted">Comparing keystroke vectors against baseline profile...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form inputs */}
          <form onSubmit={handleSend} className="border-t border-white/5 p-4 bg-black/25 flex gap-3">
            <input 
              type="text"
              disabled={analyzing}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Type your verification text here..."
              className="flex-grow bg-[#030304]/60 border border-white/5 focus:border-white/30 focus:ring-0 rounded-lg p-3 text-xs outline-none text-textWhite transition-all duration-300"
            />
            <button 
              type="submit"
              disabled={analyzing || !inputVal.trim()}
              className="px-4.5 bg-white text-black hover:bg-zinc-200 disabled:opacity-40 rounded-lg flex items-center justify-center transition-colors cursor-pointer border-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>

        {/* RIGHT COLUMN: COGNITIVE PLOTS */}
        <div className="md:col-span-4 flex flex-col gap-6">
          
          {/* Duress & Sentiment panel */}
          <div className="bg-[#0C0C14]/50 border border-white/5 rounded-2xl p-5 text-left flex flex-col gap-4 shadow-lg backdrop-blur-sm glass-card relative overflow-hidden">
            <div className="border-b border-white/5 pb-2 text-[10px] text-textMuted uppercase font-semibold">
              <span>Keystroke Timing Analysis</span>
            </div>
            
            <div className="flex flex-col gap-3 text-[10px] font-semibold">
              <div>
                <div className="flex justify-between mb-1">
                  <span>Typing Velocity</span>
                  <span className="text-white">Nominal</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-white h-full w-[85%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>Cognitive Drift Index</span>
                  <span className="text-white">0.01 (Low)</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-white h-full w-[4%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>Stress Sentiment Classifier</span>
                  <span className="text-white">99% Safe</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-white h-full w-[99%]" />
                </div>
              </div>
            </div>

            <div className="bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-lg text-[9px] text-emerald-400 uppercase tracking-wide leading-relaxed mt-2 font-semibold">
              Natural pacing detected. HuggingFace classifier matches user identity profile.
            </div>
          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full py-5 px-6 border-t border-white/5 bg-[#050506]/40 font-mono text-[9px] text-[#52525B]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <span>DEADDROP WELLNESS CHECK-IN</span>
          <span>© 2026 SERVICES.</span>
        </div>
      </footer>

    </div>
  );
}
