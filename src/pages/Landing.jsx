import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import FilmGrain from '../components/FilmGrain';
import Logo from '../components/Logo';
import { Terminal, Lock, CheckCircle2, RefreshCw, Key, Shield, FileLock, UserCheck } from 'lucide-react';

const AGENTS_LIST = [
  { id: 'AG-01', name: 'Onboarding Health Agent', phase: 'SETUP', role: 'Scores Vault variables to block structural vulnerabilities.' },
  { id: 'AG-02', name: 'Trustee Readiness Agent', phase: 'MONITOR', role: 'Tests trustee communication paths and checks inbox activity.' },
  { id: 'AG-03', name: 'Capsule Freshness Agent', phase: 'MONITOR', role: 'Audits Vault age and reminds users to refresh expired accounts.' },
  { id: 'AG-04', name: 'Cognitive Baseline Agent', phase: 'MONITOR', role: 'Analyzes user text syntax to monitor cognitive decline.' },
  { id: 'AG-05', name: 'Anti-Collusion Agent', phase: 'MONITOR', role: 'Freezes release if trustees submit claims within identical windows.' },
  { id: 'AG-06', name: 'Wellness Verification Agent', phase: 'CHECKIN', role: 'Conducts conversation checks to intercept automated scripts.' },
  { id: 'AG-07', name: 'Context-Aware Grace Agent', phase: 'GRACE', role: 'Automatically pauses switch timers during travel alerts.' },
  { id: 'AG-08', name: 'Multi-Channel Escalation Agent', phase: 'GRACE', role: 'Coordinates Twilio SMS, WhatsApp, and mail queues.' },
  { id: 'AG-09', name: 'Release Orchestrator Agent', phase: 'RELEASE', role: 'Generates single-use retrieve links and verifies signatures.' },
  { id: 'AG-10', name: 'Trustee Guidance Agent', phase: 'RELEASE', role: 'Guides family recipients through local key restoration.' },
  { id: 'AG-11', name: 'Executor Guidance Agent', phase: 'GUIDE', role: 'Performs RAG search over user instructions post-release.' }
];

const LOG_TEMPLATES = [
  { type: "OK", text: "Onboarding Health Agent → Vault configuration validated. Score: 94/100." },
  { type: "INFO", text: "Trustee Readiness Agent → Verified SMS path for Trustee Priya Sharma. Active." },
  { type: "WARN", text: "Capsule Freshness Agent → Vault files audit: Freshness status OK." },
  { type: "OK", text: "Cognitive Baseline Agent → Syntactic check nominal. Deviation: 0.01." },
  { type: "WARN", text: "Anti-Collusion Agent → Verification check: Nominals checked." },
  { type: "OK", text: "Wellness Verification Agent → Check-in completed. Switch timer reset." },
  { type: "INFO", text: "Context-Aware Grace Agent → Checking active travel parameters. Nominal." },
  { type: "WARN", text: "Multi-Channel Escalation Agent → Escalation queue standby." },
  { type: "OK", text: "Release Orchestrator Agent → Cryptographic links standby." },
  { type: "INFO", text: "Trustee Guidance Agent → Client-side Shamir node loaded." },
  { type: "OK", text: "Executor Guidance Agent → Instructions RAG mapping verified." }
];

export default function Landing() {
  const [fileSelected, setFileSelected] = useState(false);
  const [fileName, setFileName] = useState('');
  const [splitStep, setSplitStep] = useState('idle'); // idle | encrypting | splitting | complete
  const [shards, setShards] = useState([]);
  
  const cardRef = useRef(null);
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });

  const { scrollYProgress } = useScroll();
  const scaleValue = useTransform(scrollYProgress, [0, 0.5], [1, 1.01]);
  const rotateValue = useTransform(scrollYProgress, [0, 0.5], [0, 0.5]);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMouseCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const [logs, setLogs] = useState([
    { type: "INFO", text: "DeadDrop Security System: Active. Status: OK." },
    { type: "OK", text: "Escrow network listening for periodic check-ins..." }
  ]);
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomLog = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [...prev.slice(-30), { type: randomLog.type, text: `[${timestamp}] ${randomLog.text}` }]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const triggerSplitSimulation = (name = "estate_will.bin") => {
    setFileName(name);
    setFileSelected(true);
    setSplitStep('encrypting');
    
    setTimeout(() => {
      setSplitStep('splitting');
      setShards([
        { id: 1, label: 'SHARD 01', owner: 'Aarav Patel', val: '0x8B5C...D4B2' },
        { id: 2, label: 'SHARD 02', owner: 'Priya Sharma', val: '0x06B6...A78B' },
        { id: 3, label: 'SHARD 03', owner: 'Rohan Iyer', val: '0x6366...9CA3' }
      ]);
      
      setTimeout(() => {
        setSplitStep('complete');
      }, 2500);
    }, 1800);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (file) {
      triggerSplitSimulation(file.name);
    }
  };

  const [t1Active, setT1Active] = useState(false);
  const [t2Active, setT2Active] = useState(false);
  const [t3Active, setT3Active] = useState(false);

  const getSubmissionsCount = () => {
    let count = 0;
    if (t1Active) count++;
    if (t2Active) count++;
    if (t3Active) count++;
    return count;
  };

  return (
    <div className="relative min-h-screen bg-[#030304] text-textWhite font-sans overflow-hidden">
      <FilmGrain />

      {/* PREMIUM FULL-WIDTH GLASS NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#030304]/75 backdrop-blur-md border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center shadow-lg">
        <Logo />
        <div className="flex items-center gap-6 text-xs font-semibold">
          <Link to="/login" className="text-textMuted hover:text-textWhite transition-colors duration-200">
            Access Vault
          </Link>
          <Link to="/signup">
            <button className="px-5 py-2.5 bg-white text-black hover:bg-zinc-200 font-extrabold tracking-wide transition-all duration-200 uppercase rounded-full shadow-lg shadow-white/5 border-0 cursor-pointer text-[10px]">
              Setup Vault
            </button>
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-36 pb-20 grid lg:grid-cols-12 gap-12 items-center min-h-[95vh]">
        
        {/* Editorial Pitch */}
        <div className="lg:col-span-6 flex flex-col text-left">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/15 text-white/90 text-[10px] font-bold uppercase tracking-wider self-start mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            Active Escrow Grid
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-sans font-extrabold text-4xl sm:text-5xl lg:text-6xl text-textWhite tracking-tight leading-[1.08] mb-6 animate-pulse-slow"
          >
            Your secrets <br />
            <span className="text-gradient">survive you</span>.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-textMuted text-sm sm:text-base leading-relaxed font-light mb-8 max-w-xl"
          >
            A zero-knowledge dead man's switch. Encrypt critical archives locally. Split key shards to trustee nodes. Telemetries monitored continuously by 11 independent AI agents.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 text-xs font-bold uppercase"
          >
            <Link to="/signup" className="grow sm:grow-0">
              <button className="w-full sm:w-auto px-8 py-3.5 bg-white text-black hover:bg-zinc-200 tracking-wider rounded-full transition-all duration-200 cursor-pointer shadow-lg shadow-white/5 border-0 text-center flex items-center justify-center">
                Setup Vault
              </button>
            </Link>
            <a href="#how-it-works" className="grow sm:grow-0">
              <button className="w-full sm:w-auto px-8 py-3.5 border border-white/10 hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.03] text-textWhite tracking-wide rounded-full transition-all duration-200 text-center">
                Read Manual
              </button>
            </a>
          </motion.div>
        </div>

        {/* HOLOGRAPHIC ENVELOPE / SHARDING MODULE */}
        <div className="lg:col-span-6 flex flex-col items-center w-full">
          <motion.div 
            ref={cardRef}
            onMouseMove={handleMouseMove}
            style={{ scale: scaleValue, rotate: rotateValue }}
            className="w-full max-w-lg bg-[#0B0B14]/65 border border-white/12 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 relative shadow-2xl overflow-hidden glass-panel glint-effect"
          >
            {/* Cursor Spotlight Glow */}
            <div 
              className="absolute pointer-events-none rounded-full filter blur-[60px] opacity-30"
              style={{
                width: '180px',
                height: '180px',
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)',
                left: `${mouseCoords.x - 90}px`,
                top: `${mouseCoords.y - 90}px`,
              }}
            />

            {/* Industrial header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-3 text-[9px] text-textMuted uppercase font-bold tracking-wider relative z-10">
              <span>HOLOGRAPHIC SHARD CONSOLE</span>
              <span>AES-GCM 256-BIT</span>
            </div>

            <AnimatePresence mode="wait">
              {splitStep === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => triggerSplitSimulation()}
                  className="border border-white/5 hover:border-white/20 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 bg-white/[0.01] hover:bg-white/[0.02] group relative z-10"
                >
                  <div className="w-14 h-14 border border-white/10 rounded-full flex items-center justify-center mb-4 group-hover:border-white/30 transition-colors relative">
                    <div className="absolute inset-1 border border-dashed border-white/20 rounded-full animate-spin-slow" />
                    <Lock className="w-4 h-4 text-textMuted group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-xs font-semibold text-textWhite block mb-1 uppercase tracking-wider">
                    Drag & Drop secure payload here
                  </span>
                  <span className="text-[9px] text-textMuted uppercase">Or click to simulate secure sharding</span>
                </motion.div>
              )}

              {splitStep === 'encrypting' && (
                <motion.div
                  key="encrypting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-10 flex flex-col items-center text-center gap-4 relative z-10"
                >
                  <div className="w-8 h-8 rounded-full border border-t-white border-white/5 animate-spin" />
                  <span className="text-xs text-white uppercase font-bold tracking-wider">
                    CONVERTING LOCAL ARCHIVE...
                  </span>
                  <span className="text-[9px] text-textMuted">
                    Generating zero-knowledge entropy keys in browser memory...
                  </span>
                </motion.div>
              )}

              {splitStep === 'splitting' && (
                <motion.div
                  key="splitting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-2 flex flex-col items-center w-full gap-6 text-center relative z-10"
                >
                  <span className="text-[10px] text-white uppercase font-bold tracking-wider">
                    DISTRIBUTING CRYPTO KEY SHARDS
                  </span>
                  
                  {/* Holographic crystal keycards */}
                  <div className="flex gap-4 justify-center w-full items-stretch">
                    {shards.map((shard) => (
                      <motion.div
                        key={shard.id}
                        initial={{ scale: 0.8, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
                        className="bg-[#0C0C14]/75 border border-white/20 p-3 rounded-xl w-28 text-left shadow-2xl relative flex flex-col justify-between gap-3 backdrop-blur-md"
                      >
                        {/* Shard top logo */}
                        <div className="flex justify-between items-center">
                          <Key className="w-3.5 h-3.5 text-white" />
                          <span className="bg-white/10 px-1 py-0.5 rounded text-[7px] text-textWhite font-bold">ACTIVE</span>
                        </div>
                        
                        <div>
                          <span className="text-[8px] text-textMuted uppercase font-bold block">{shard.label}</span>
                          <span className="text-[9px] text-textWhite font-semibold block truncate mt-0.5">{shard.owner}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {splitStep === 'complete' && (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-2 flex flex-col items-center gap-5 text-center w-full relative z-10"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-forestGreen animate-pulse" />
                    <span className="text-xs text-forestGreen uppercase tracking-wider font-bold">
                      SECURE VAULT ENVELOPE SEALED
                    </span>
                  </div>
                  
                  <div className="text-left w-full bg-[#030304]/40 border border-white/5 p-4 rounded-xl text-[10px] text-[#A1A1AA] flex flex-col gap-2 relative">
                    <div className="flex justify-between border-b border-white/5 pb-1.5">
                      <span>SECURED FILE:</span>
                      <span className="text-white font-semibold truncate max-w-[150px]">{fileName}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1.5">
                      <span>ESCROW CODE:</span>
                      <span className="text-forestGreen font-bold">LOCKED_2_OF_3</span>
                    </div>
                    <div className="text-[9px] text-textMuted leading-relaxed mt-2 uppercase">
                      Shamir secret splitting complete. Keys locked with trustee RSA credentials. Vault active.
                    </div>
                  </div>

                  <button 
                    onClick={() => { setSplitStep('idle'); setFileSelected(false); }}
                    className="text-[9px] font-semibold text-white hover:text-white/80 uppercase transition-colors duration-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Re-simulate secure split
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION (Conveyor Stepper) */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="text-left mb-16 max-w-xl">
          <span className="text-xs text-silverAccent uppercase tracking-widest font-bold">
            PROTOCOL LIFE CYCLE
          </span>
          <h2 className="font-sans font-bold text-3xl sm:text-4xl text-textWhite tracking-tight mt-3">
            Secure Custody Workflow
          </h2>
          <p className="text-textMuted text-xs uppercase mt-2">
            Zero-knowledge keys and stateful telemetry.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="glass-card p-6 rounded-xl text-left flex flex-col gap-3 glint-effect">
            <span className="text-xs text-white/60 font-bold">01 / LOCAL SEAL</span>
            <h4 className="font-sans font-bold text-sm text-textWhite uppercase">Browser AES-GCM</h4>
            <p className="text-textMuted text-xs leading-relaxed">
              Master keys generated in RAM. Files are encrypted client-side before S3 storage.
            </p>
          </div>

          <div className="glass-card p-6 rounded-xl text-left flex flex-col gap-3 glint-effect">
            <span className="text-xs text-white/60 font-bold">02 / SHARD SPLIT</span>
            <h4 className="font-sans font-bold text-sm text-textWhite uppercase">Shamir Matrix</h4>
            <p className="text-textMuted text-xs leading-relaxed">
              Master keys split mathematically. Shards wrapped with trustee public keys.
            </p>
          </div>

          <div className="glass-card p-6 rounded-xl text-left flex flex-col gap-3 glint-effect">
            <span className="text-xs text-white/60 font-bold">03 / ACTIVE SWEEP</span>
            <h4 className="font-sans font-bold text-sm text-textWhite uppercase">Agent Monitors</h4>
            <p className="text-textMuted text-xs leading-relaxed">
              11 agents check check-ins and baseline writing. Missed switches trigger alerts.
            </p>
          </div>

          <div className="glass-card p-6 rounded-xl text-left flex flex-col gap-3 glint-effect">
            <span className="text-xs text-white/60 font-bold">04 / RECONSTRUCT</span>
            <h4 className="font-sans font-bold text-sm text-textWhite uppercase">Decrypt Output</h4>
            <p className="text-textMuted text-xs leading-relaxed">
              Trustees submit shards post-escalation to restore the vault in browser.
            </p>
          </div>

        </div>
      </section>

      {/* INTERACTIVE SHARD RECONSTRUCTION SIMULATOR */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5 bg-white/[0.005]">
        <div className="grid md:grid-cols-12 gap-12 items-center">
          
          <div className="md:col-span-5 text-left">
            <span className="text-xs text-silverAccent uppercase tracking-widest font-bold">
              DECRYPT ESCROW RULES
            </span>
            <h3 className="font-sans font-bold text-2xl sm:text-3xl text-textWhite mt-3 uppercase tracking-tight">
              Signatory Threshold
            </h3>
            <p className="text-textMuted text-xs uppercase mt-2 mb-6">
              2 of 3 keys required to reconstruct payload.
            </p>
            <p className="text-textMuted text-sm leading-relaxed mb-6 font-light">
              Submit key shards below. Watch how the vault status automatically transitions when the threshold is reached.
            </p>
            <div className="flex gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-textWhite font-bold">{getSubmissionsCount()} / 3</span>
                <span className="text-[9px] text-textMuted uppercase">SUBMITTED</span>
              </div>
              <div className="w-[1px] h-8 bg-white/10" />
              <div className="flex flex-col">
                <span className={`text-xs font-bold ${getSubmissionsCount() >= 2 ? 'text-forestGreen' : 'text-silverAccent'}`}>
                  {getSubmissionsCount() >= 2 ? 'SECURE_RELEASE' : 'HOLD_ESCROW'}
                </span>
                <span className="text-[9px] text-textMuted uppercase">VAULT STATE</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-7 w-full">
            <div className="bg-[#08080B]/85 border border-white/5 rounded-2xl p-6 flex flex-col gap-6 relative glass-panel">
              <div className="flex flex-col gap-3">
                
                {/* Trustee 1 Check */}
                <div 
                  onClick={() => setT1Active(!t1Active)}
                  className={`border p-3.5 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 ${t1Active ? 'border-white/40 bg-white/[0.02]' : 'border-white/5 hover:border-white/10 bg-white/[0.01]'}`}
                >
                  <div className="flex items-center gap-3">
                    <Key className={`w-4 h-4 ${t1Active ? 'text-white' : 'text-textMuted'}`} />
                    <span className="text-xs uppercase text-textWhite">Aarav Patel (Shard 01)</span>
                  </div>
                  <span className="text-[9px] text-textMuted">{t1Active ? 'Keys Submitted' : 'Offline'}</span>
                </div>

                {/* Trustee 2 Check */}
                <div 
                  onClick={() => setT2Active(!t2Active)}
                  className={`border p-3.5 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 ${t2Active ? 'border-white/40 bg-white/[0.02]' : 'border-white/5 hover:border-white/10 bg-white/[0.01]'}`}
                >
                  <div className="flex items-center gap-3">
                    <Key className={`w-4 h-4 ${t2Active ? 'text-white' : 'text-textMuted'}`} />
                    <span className="text-xs uppercase text-textWhite">Priya Sharma (Shard 02)</span>
                  </div>
                  <span className="text-[9px] text-textMuted">{t2Active ? 'Keys Submitted' : 'Offline'}</span>
                </div>

                {/* Trustee 3 Check */}
                <div 
                  onClick={() => setT3Active(!t3Active)}
                  className={`border p-3.5 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 ${t3Active ? 'border-white/40 bg-white/[0.02]' : 'border-white/5 hover:border-white/10 bg-white/[0.01]'}`}
                >
                  <div className="flex items-center gap-3">
                    <Key className={`w-4 h-4 ${t3Active ? 'text-white' : 'text-textMuted'}`} />
                    <span className="text-xs uppercase text-textWhite">Rohan Iyer (Shard 03)</span>
                  </div>
                  <span className="text-[9px] text-textMuted">{t3Active ? 'Keys Submitted' : 'Offline'}</span>
                </div>

              </div>

              {/* Status bar */}
              <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-left">
                {getSubmissionsCount() >= 2 ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-forestGreen animate-pulse" />
                    <span className="text-[10px] text-forestGreen uppercase font-bold tracking-wider">
                      SUCCESS: Local key reconstructed. Decrypting binary payload...
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span className="text-[10px] text-textMuted uppercase tracking-wider">
                      WAITING: Escrow held. Needs {2 - getSubmissionsCount()} more key shards...
                    </span>
                  </div>
                )}
                <button 
                  onClick={() => { setT1Active(false); setT2Active(false); setT3Active(false); }}
                  className="px-3 py-1 border border-white/10 rounded-full bg-white/[0.02] hover:bg-white/5 text-[9px] uppercase text-textMuted hover:text-white transition-all cursor-pointer"
                >
                  Reset Shards
                </button>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 11 AGENTS PIN DIAGRAM MATRIX */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="text-left mb-12 max-w-xl">
          <span className="text-xs text-silverAccent uppercase tracking-widest font-bold">
            ACTIVE TELEMETRY NETWORK
          </span>
          <h2 className="font-sans font-bold text-3xl sm:text-4xl text-textWhite tracking-tight mt-3 uppercase">
            11 Agent Matrix
          </h2>
          <p className="text-textMuted text-xs uppercase mt-2">
            Independent telemetry nodes listening continuously on user signals.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {AGENTS_LIST.map((agent, index) => (
            <motion.div 
              key={index}
              whileHover={{ y: -3, rotateZ: 0.3 }}
              className="bg-[#0C0D16]/50 border border-white/5 p-6 rounded-2xl hover:border-white/15 transition-all duration-300 text-left flex flex-col justify-between shadow-lg backdrop-blur-sm glass-card"
            >
              <div>
                <div className="flex justify-between items-center mb-4 text-[9px]">
                  <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10 text-white font-bold">
                    {agent.phase}
                  </span>
                  <span className="text-textMuted font-bold">{agent.id}</span>
                </div>
                <h4 className="font-sans font-bold text-sm text-textWhite mb-2 uppercase tracking-wide">{agent.name}</h4>
                <p className="text-[11px] text-textMuted leading-relaxed">{agent.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* LIVE DIAGNOSTICS TERMINAL */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-12 border-t border-white/5">
        <div className="w-full bg-[#050508]/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
          
          {/* Title Bar */}
          <div className="bg-[#0C0D1A]/80 border-b border-white/5 px-4 py-3.5 flex items-center justify-between text-xs text-textMuted">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-white" />
              <span>KERNEL DIAGNOSTICS LOG [DEADDROP_AGENT_BUS]</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-forestGreen animate-pulse" />
              <span className="text-[9px] tracking-wider text-forestGreen">SYNCED</span>
            </div>
          </div>

          {/* Logs scrollbox */}
          <div 
            ref={terminalRef}
            className="p-5 text-[11px] text-[#A1A1AA] h-72 overflow-y-auto flex flex-col gap-2.5 text-left bg-black/45 scrollbar-none"
          >
            {logs.map((log, index) => (
              <div key={index} className="flex gap-2">
                <span className={`select-none font-bold ${log.type === 'OK' ? 'text-forestGreen' : 'type-white'}`}>
                  [{log.type}]
                </span>
                <span>{log.text}</span>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/5 bg-[#050506] py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-xs">
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2">
            <Logo />
            <span className="text-[9px] text-textMuted uppercase mt-2 tracking-widest">
              YOUR SECRETS SURVIVE YOU.
            </span>
          </div>
          <div className="flex gap-8 text-textMuted uppercase tracking-wider">
            <a href="#" className="hover:text-white transition-colors">Register</a>
            <a href="#" className="hover:text-white transition-colors">Security</a>
            <a href="#" className="hover:text-white transition-colors">License</a>
          </div>
          <div className="text-[9px] text-[#52525B]">
            © 2026 DEADDROP CUSTODIAL ENVELOPE SERVICES.
          </div>
        </div>
      </footer>

    </div>
  );
}
