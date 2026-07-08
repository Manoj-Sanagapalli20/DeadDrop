import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Key, Bell, Power, AlertTriangle, CheckCircle, Database, Clock, RefreshCw, ChevronRight } from 'lucide-react';
import FilmGrain from '../components/FilmGrain';
import Logo from '../components/Logo';
import { supabase } from '../utils/supabaseClient';

export default function Dashboard() {
  const navigate = useNavigate();
  const [daysRemaining, setDaysRemaining] = useState(28);
  const [healthScore, setHealthScore] = useState(94);
  const [logs, setLogs] = useState([
    "Vault switch active: monitoring weekly check-in signals.",
    "All trustee secure channels verified: 3 of 3 active."
  ]);
  const [checkingIn, setCheckingIn] = useState(false);
  const [profileName, setProfileName] = useState('');

  // Fetch logged in profile details
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

          if (!error && profile) {
            setProfileName(profile.full_name);
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      }
    };

    fetchProfile();
  }, []);

  // Trustee health states
  const [trustees, setTrustees] = useState([
    { id: 1, name: 'Aarav Patel', email: 'aarav@patel.in', shard: 'Shard 1', status: 'Online' },
    { id: 2, name: 'Priya Sharma', email: 'priya@sharma.in', shard: 'Shard 2', status: 'Online' },
    { id: 3, name: 'Rohan Iyer', email: 'rohan@iyer.in', shard: 'Shard 3', status: 'Online' }
  ]);
  const [pingingId, setPingingId] = useState(null);
  const [alertBanner, setAlertBanner] = useState(null); // 'rohan_offline' | null

  // Simple check-in simulation
  const handleQuickCheckin = () => {
    setCheckingIn(true);
    setLogs((prev) => [...prev, "Check-in signal sent from dashboard cockpit."]);
    
    setTimeout(() => {
      setDaysRemaining(30);
      setLogs((prev) => [...prev, "Identity signature verified. Switch timer reset: 30 days remaining."]);
      setCheckingIn(false);
    }, 1200);
  };

  // Ping check simulation for trustee
  const handlePingTrustee = (id, name) => {
    setPingingId(id);
    setLogs((prev) => [...prev, `Trustee Readiness Agent → Verifying secure channel to ${name}...`]);

    setTimeout(() => {
      setPingingId(null);
      if (id === 3) {
        // Rohan Iyer goes unresponsive
        setTrustees((prev) => prev.map(t => t.id === 3 ? { ...t, status: 'Unresponsive' } : t));
        setHealthScore(74); // drop readiness score
        setAlertBanner('rohan_offline');
        setLogs((prev) => [
          ...prev, 
          `Trustee Readiness Agent → Connection timeout. No response received from Rohan Iyer.`,
          `Onboarding Health Agent → Trustee unresponsiveness flagged. Vault safety index compromised!`
        ]);
      } else {
        setLogs((prev) => [...prev, `Trustee Readiness Agent → Verification successful for ${name}. Channel synced.`]);
      }
    }, 1500);
  };

  // Promote Backup signee
  const handlePromoteBackup = () => {
    setLogs((prev) => [...prev, `Trustee Readiness Agent → Activating automatic backup promotion workflow...`]);
    setTimeout(() => {
      setTrustees((prev) => prev.map(t => t.id === 3 ? { id: 3, name: 'Karan Nair', email: 'karan@nair.in', shard: 'Shard 3', status: 'Online' } : t));
      setHealthScore(94); // restore readiness score
      setAlertBanner(null);
      setLogs((prev) => [
        ...prev, 
        `Trustee Readiness Agent → Backup trustee Karan Nair promoted to Shard 3.`,
        `Onboarding Health Agent → Vault safety index restored to 94/100.`
      ]);
    }, 1200);
  };

  // Status logs timer
  useEffect(() => {
    const logInterval = setInterval(() => {
      const mockPings = [
        "Cognitive Baseline Agent → Syntactic patterns verify user identity baseline.",
        "Anti-Collusion Agent → Watching signatory logs. No duplicate requests flagged.",
        "Onboarding Health Agent → Vault safety score nominal."
      ];
      const randomPing = mockPings[Math.floor(Math.random() * mockPings.length)];
      setLogs((prev) => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${randomPing}`]);
    }, 7000);
    return () => clearInterval(logInterval);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#030304] text-textWhite font-sans overflow-hidden flex flex-col justify-between">
      <FilmGrain />

      {/* PREMIUM FULL-WIDTH GLASS NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#030304]/75 backdrop-blur-md border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center shadow-lg">
        <Logo />
        <div className="flex items-center gap-6 text-xs font-semibold">
          {profileName && <span className="text-white uppercase tracking-wider font-extrabold text-[10px]">Agent: {profileName}</span>}
          <span className="text-textMuted">Vault Reference: 0x8F5C</span>
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/');
            }}
            className="px-3 py-1 border border-white/10 rounded-full bg-white/[0.02] hover:bg-white/5 hover:border-white/20 text-textMuted hover:text-white transition-all cursor-pointer text-[10px] font-semibold"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 flex-grow max-w-7xl mx-auto w-full px-6 pt-24 pb-16 grid lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN: COUNTDOWN RING & TELEMETRY */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Main Vault Switch widget */}
          <div className="bg-[#08080B]/85 border border-white/7 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-around gap-6 glass-panel relative overflow-hidden glint-effect">
            
            {/* Countdown SVG progress ring */}
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="42" 
                  stroke="rgba(255,255,255,0.02)" 
                  strokeWidth="6" 
                  fill="transparent" 
                />
                {/* Animated progress ring in silver */}
                <motion.circle 
                  cx="50" 
                  cy="50" 
                  r="42" 
                  stroke="#FFFFFF" 
                  strokeWidth="6" 
                  fill="transparent" 
                  strokeDasharray="264"
                  animate={{ strokeDashoffset: 264 - (264 * daysRemaining) / 30 }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_8px_rgba(255,255,255,0.25)]"
                />
              </svg>
              
              {/* Central text readouts */}
              <div className="absolute flex flex-col items-center justify-center font-sans">
                <span className="text-4xl font-extrabold text-textWhite">{daysRemaining}</span>
                <span className="text-[9px] text-textMuted uppercase tracking-widest mt-1">Days remaining</span>
              </div>
            </div>

            {/* Quick check-in panel */}
            <div className="flex flex-col text-left gap-4 max-w-xs w-full">
              <div>
                <span className="text-[10px] text-white/60 uppercase tracking-widest block font-bold mb-1">
                  Telemetry nominal
                </span>
                <h2 className="font-sans font-bold text-lg text-textWhite uppercase">
                  Welcome Back, {profileName || 'Agent'}
                </h2>
                <p className="text-textMuted text-xs mt-1.5 leading-relaxed font-light">
                  Your last verification signal was synced 48 hours ago. Wellness check-in due in 28 days.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button 
                  onClick={handleQuickCheckin}
                  disabled={checkingIn}
                  className="w-full py-3 bg-white text-black hover:bg-zinc-200 font-bold text-xs tracking-wider rounded-full transition-all duration-200 uppercase flex items-center justify-center gap-2 cursor-pointer border-0 shadow-lg"
                >
                  {checkingIn ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Reset Custody Switch</span>
                  )}
                </button>
                <Link to="/checkin" className="text-center text-[10px] text-textMuted hover:text-white transition-colors font-semibold flex items-center justify-center gap-1 mt-2 hover:underline">
                  Or open Wellness Chat Agent →
                </Link>
              </div>
            </div>

          </div>

          {/* Diagnostics terminal logs */}
          <div className="bg-[#050508]/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col flex-grow min-h-[250px]">
            <div className="bg-[#0C0D1A]/80 border-b border-white/5 px-4 py-3.5 flex items-center justify-between text-xs text-textMuted">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-white" />
                <span>Security activity logs</span>
              </div>
              <span className="text-[9px] tracking-wider text-forestGreen font-bold">SYNCED</span>
            </div>
            <div className="p-4 text-[11px] text-[#A1A1AA] flex flex-col gap-2.5 text-left bg-black/45 flex-grow overflow-y-auto max-h-[300px] scrollbar-none">
              {logs.map((log, index) => (
                <div key={index} className="flex gap-2">
                  <span className="text-white/60 select-none font-bold">{index + 1}</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: HEALTH METER & TRUSTEE STATUS */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Vault Health Card */}
          <div className="bg-[#0A0A12]/40 border border-white/5 rounded-2xl p-5 text-left flex flex-col gap-4 shadow-lg backdrop-blur-sm glass-card relative overflow-hidden glint-effect">
            <div className="flex justify-between items-center border-b border-white/5 pb-2 text-[9px] text-textMuted uppercase font-semibold">
              <span>Vault safety index</span>
              <span className="text-white font-bold">Approved</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold text-gradient">{healthScore}/100</span>
                <span className="text-[9px] text-textMuted uppercase mt-0.5 font-semibold">Ready Score</span>
              </div>
              <Shield className="w-8 h-8 text-white/25" />
            </div>

            <div className="text-[10px] text-textMuted flex flex-col gap-2 uppercase font-semibold">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-forestGreen" />
                <span>3 Trustees configured</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-forestGreen" />
                <span>Payload encrypted locally</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-forestGreen" />
                <span>RAG manuals generated</span>
              </div>
            </div>
          </div>

          {/* Trustee Network Monitor */}
          <div className="bg-[#0A0A12]/40 border border-white/5 rounded-2xl p-5 text-left flex flex-col gap-4 shadow-lg backdrop-blur-sm glass-card relative overflow-hidden">
            <div className="flex justify-between items-center border-b border-white/5 pb-2 text-[9px] text-textMuted uppercase font-semibold">
              <span>Key trustees</span>
              <span>2 of 3 threshold</span>
            </div>

            <div className="flex flex-col gap-3">
              {trustees.map((t) => (
                <div key={t.id} className="flex flex-col gap-2 border-b border-white/5 pb-2.5 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 font-sans">
                      <div className="w-7 h-7 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center">
                        <Key className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-semibold text-textWhite">{t.name}</span>
                        <span className="text-[9px] text-textMuted font-medium">{t.shard} · {t.email}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 font-sans">
                      <button 
                        onClick={() => handlePingTrustee(t.id, t.name)}
                        disabled={pingingId !== null}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-0.5 rounded text-[9px] uppercase text-textWhite transition-colors cursor-pointer"
                      >
                        {pingingId === t.id ? (
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <span>Ping</span>
                        )}
                      </button>
                      
                      <div className={`flex items-center gap-1.5 text-[9px] font-semibold uppercase ${t.status === 'Online' ? 'text-forestGreen' : 'text-red-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'Online' ? 'bg-forestGreen' : 'bg-red-500 animate-pulse'}`} />
                        <span>{t.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Unresponsive alert banner */}
              {alertBanner === 'rohan_offline' && (
                <div className="bg-red-950/20 border border-red-900/30 p-3 rounded-lg text-[10px] text-red-400 uppercase tracking-wide leading-relaxed mt-2 flex flex-col gap-2 font-semibold">
                  <span>Alert: Rohan Iyer (Shard 3) is unresponsive. Vault safety index compromised.</span>
                  <button 
                    onClick={handlePromoteBackup}
                    className="w-full bg-red-500/20 hover:bg-red-500/35 border border-red-500/40 text-red-200 py-1.5 rounded-full text-[9px] font-bold uppercase transition-colors cursor-pointer"
                  >
                    Promote Backup Trustee (Karan Nair)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick links settings */}
          <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
            <Link to="/setup" className="glass-card border border-white/5 p-4 rounded-xl text-center flex flex-col justify-center items-center gap-2 hover:border-white/15">
              <Database className="w-4 h-4 text-white" />
              <span className="text-[10px] text-textWhite uppercase">Configure Vault</span>
            </Link>
            <Link to="/agents" className="glass-card border border-white/5 p-4 rounded-xl text-center flex flex-col justify-center items-center gap-2 hover:border-white/15">
              <Shield className="w-4 h-4 text-white" />
              <span className="text-[10px] text-textWhite uppercase">Agent Matrix</span>
            </Link>
          </div>

        </div>

      </main>

      {/* Footer copyright */}
      <footer className="relative z-10 w-full py-5 px-6 border-t border-white/5 bg-[#050506]/40 font-mono text-[9px] text-[#52525B]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <span>DEADDROP SECURITY COCKPIT</span>
          <span>© 2026 SERVICES.</span>
        </div>
      </footer>

    </div>
  );
}
