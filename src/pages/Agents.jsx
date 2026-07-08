import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Shield, Cpu, RefreshCw, Layers, CheckCircle } from 'lucide-react';
import FilmGrain from '../components/FilmGrain';
import Logo from '../components/Logo';

const AGENTS_LIST = [
  { id: 'AG-01', name: 'Onboarding Health Agent', phase: 'Setup', role: 'Scores Vault variables to block structural vulnerabilities.', logs: [
    "Vault scoring pipeline initialized...",
    "Verifying file uploads... Detected: credentials_backup.zip (OK)",
    "Checking trustee counts... 3/3 assigned (OK)",
    "Checking check-in timers... 30 days (SAFE)",
    "Final Vault Health Score compiled: 94/100. Approval granted."
  ] },
  { id: 'AG-02', name: 'Trustee Readiness Agent', phase: 'Monitor', role: 'Tests trustee communication paths and checks inbox activity.', logs: [
    "Initiating monthly trustee readiness audit...",
    "Sending SMS verification path to Aarav Patel... Responsive (0.8s)",
    "Sending WhatsApp path to Priya Sharma... Responsive (1.1s)",
    "Verifying active session logs for Rohan Iyer... Unresponsive (60 days timeout).",
    "Readiness check failed: Auto-promoting backup trustee Karan Nair."
  ] },
  { id: 'AG-03', name: 'Capsule Freshness Agent', phase: 'Monitor', role: 'Audits Vault age and reminds users to refresh expired accounts.', logs: [
    "Scanning stored metadata for archive freshness...",
    "Target file: credentials_backup.zip (Upload Date: 2026-07-05)",
    "File age is 0 months. Threshold limit: 6 months.",
    "File status: FRESH. Next reminder scheduled for 2027-01-05."
  ] },
  { id: 'AG-04', name: 'Cognitive Baseline Agent', phase: 'Monitor', role: 'Analyzes user text syntax to monitor cognitive decline.', logs: [
    "Loading historical check-in baseline vector coordinates from ChromaDB...",
    "Parsing latest check-in response syntax...",
    "Syntactic complexity score: 0.88. Baseline deviation: 0.01.",
    "Drift comparison: NORMAL. Cognitive status: UNCHANGED."
  ] },
  { id: 'AG-05', name: 'Anti-Collusion Agent', phase: 'Monitor', role: 'Freezes release if trustees submit claims within identical windows.', logs: [
    "Audit monitor active on Supabase key request entries...",
    "Analyzing IP nodes and timings for signatories...",
    "Aarav Patel state: OFFLINE. Priya Sharma state: OFFLINE. Rohan Iyer state: OFFLINE.",
    "Collusion metrics: NOMINAL. Signatory locks engaged."
  ] },
  { id: 'AG-06', name: 'Wellness Verification Agent', phase: 'Check-in', role: 'Conducts conversation checks to intercept automated scripts.', logs: [
    "Bypassing static link checks... Initializing random wellness query tool.",
    "Generating random prompt context: 'City location and local weather'...",
    "Awaiting keystroke inputs... Synced (Keystroke velocity = 280cpm)",
    "HuggingFace sentiment checks complete. Resetting switch window."
  ] },
  { id: 'AG-07', name: 'Context-Aware Grace Agent', phase: 'Grace', role: 'Automatically pauses switch timers during travel exceptions.', logs: [
    "Exception database loaded from ChromaDB...",
    "Active travel registration flags checked... None found.",
    "Standard grace period verified: 7 days grace calculated.",
    "Chronos offset: 0.00."
  ] },
  { id: 'AG-08', name: 'Multi-Channel Escalation Agent', phase: 'Grace', role: 'Coordinates Twilio SMS, WhatsApp, and mail queues.', logs: [
    "Escalation fallback paths registered: SendGrid ➡️ Twilio SMS ➡️ Twilio WhatsApp.",
    "Escalation countdown clock: STANDBY.",
    "Timers: INACTIVE (Switch is currently in NOMINAL state)."
  ] },
  { id: 'AG-09', name: 'Release Orchestrator Agent', phase: 'Release', role: 'Generates single-use retrieve links and verifies signatures.', logs: [
    "Shamir key shard distribution logs: OK.",
    "Verification key paths: 2-of-3 threshold locked.",
    "Release state: STABLE_HOLD."
  ] },
  { id: 'AG-10', name: 'Trustee Guidance Agent', phase: 'Release', role: 'Guides family recipients through local key restoration.', logs: [
    "Interactive chatbot script engine loaded...",
    "Supported languages compiled: English, Hindi, Telugu.",
    "Awaiting release triggers... Standby."
  ] },
  { id: 'AG-11', name: 'Executor Guidance Agent', phase: 'Guide', role: 'Performs RAG search over user instructions post-release.', logs: [
    "Instruction document decrypted chunk matrices verified...",
    "Vector indices built inside ChromaDB... OK.",
    "Query channels: STANDBY."
  ] }
];

export default function Agents() {
  const navigate = useNavigate();
  const [selectedAgent, setSelectedAgent] = useState(AGENTS_LIST[0]);
  const [typedLogs, setTypedLogs] = useState([]);

  // Simulate logging write character-by-character
  useEffect(() => {
    setTypedLogs([]);
    
    if (selectedAgent.logs.length === 0) return;

    let index = 0;
    const interval = setInterval(() => {
      if (index < selectedAgent.logs.length) {
        setTypedLogs((prev) => [...prev, `${selectedAgent.logs[index]}`]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 450);

    return () => clearInterval(interval);
  }, [selectedAgent]);

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

      {/* MAIN CONTAINER */}
      <main className="relative z-10 flex-grow max-w-7xl mx-auto w-full px-6 pt-24 pb-16 grid lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN: 11 AGENTS LIST */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="text-left mb-2">
            <span className="text-[10px] text-white/60 uppercase tracking-widest font-bold">
              Telemetry matrix directory
            </span>
            <h2 className="font-sans font-bold text-lg text-textWhite uppercase mt-0.5">
              11 Independent Agents
            </h2>
          </div>
          
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[480px] scrollbar-none pr-1">
            {AGENTS_LIST.map((agent) => (
              <div 
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 flex justify-between items-center ${selectedAgent.id === agent.id ? 'bg-[#0C0D1A]/60 border-white/30 shadow-md' : 'bg-[#08080B]/60 border-white/5 hover:border-white/10'}`}
              >
                <div className="flex flex-col">
                  <span className="text-[9px] text-textMuted uppercase mb-0.5 font-semibold">{agent.id} · Phase: {agent.phase}</span>
                  <span className="text-xs font-semibold text-textWhite">{agent.name}</span>
                </div>
                <span className={`w-1.5 h-1.5 rounded-full ${selectedAgent.id === agent.id ? 'bg-white animate-pulse' : 'bg-zinc-700'}`} />
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE AGENT DIAGNOSTICS */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          <div className="bg-[#08080B]/80 border border-white/5 rounded-2xl p-6 glass-panel flex flex-col gap-4 text-left flex-grow justify-between relative overflow-hidden glint-effect">
            
            <div className="flex flex-col gap-4">
              {/* Agent Title Card */}
              <div className="flex justify-between items-center border-b border-white/5 pb-3 text-[10px] text-textMuted uppercase tracking-wider font-semibold">
                <span>Active Agent Monitor</span>
                <span className="text-white font-bold">Status Nominal</span>
              </div>

              <div>
                <h3 className="font-sans font-bold text-lg text-textWhite uppercase">{selectedAgent.name}</h3>
                <span className="inline-block mt-1 bg-white/5 border border-white/10 px-2.5 py-0.5 text-[9px] text-white font-semibold uppercase rounded-full">
                  Phase: {selectedAgent.phase}
                </span>
                <p className="text-textMuted text-xs mt-3 leading-relaxed font-light">
                  {selectedAgent.role}
                </p>
              </div>
            </div>

            {/* Active Logs terminal window */}
            <div className="bg-[#050508]/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col mt-4">
              <div className="bg-[#0C0D1A]/80 border-b border-white/5 px-4 py-2.5 flex items-center justify-between text-[10px] text-textMuted">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-white" />
                  <span>{selectedAgent.id} Diagnostics log</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-forestGreen animate-pulse" />
                  <span className="text-[8px] text-forestGreen font-bold">RUNNING</span>
                </div>
              </div>
              <div className="p-4 text-[10px] text-[#A1A1AA] h-48 overflow-y-auto flex flex-col gap-2 bg-black/45 text-left scrollbar-none">
                {typedLogs.length === 0 ? (
                  <span className="text-textMuted animate-pulse">// Initializing processor...</span>
                ) : (
                  typedLogs.map((log, index) => (
                    <div key={index} className="flex gap-2">
                      <span className="text-white">✓</span>
                      <span>{log}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full py-5 px-6 border-t border-white/5 bg-[#050506]/40 font-mono text-[9px] text-[#52525B]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <span>DEADDROP DIAGNOSTICS MONITOR</span>
          <span>© 2026 SERVICES.</span>
        </div>
      </footer>

    </div>
  );
}
