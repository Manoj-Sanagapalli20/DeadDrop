import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Key, Bell, Power, AlertTriangle, CheckCircle, Database, Clock, RefreshCw, ChevronRight, Upload } from 'lucide-react';
import FilmGrain from '../components/FilmGrain';
import Logo from '../components/Logo';
import { supabase } from '../utils/supabaseClient';
import { 
  generateAESKeyBytes, 
  encryptFile, 
  splitSecret, 
  rsaEncrypt, 
  bytesToHex, 
  hexToBytes, 
  importKeyJWK 
} from '../utils/crypto';

export default function Dashboard() {
  const navigate = useNavigate();
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [healthScore, setHealthScore] = useState(0);
  const [logs, setLogs] = useState([
    "Telemetry online: monitoring check-in countdown.",
    "Database link established: standing by for signal verification."
  ]);
  const [checkingIn, setCheckingIn] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [addingFile, setAddingFile] = useState(false);
  const addFileInputRef = useRef(null);
  
  // Vault data from Supabase
  const [activeVault, setActiveVault] = useState(null);

  // Trustee health states
  const [trustees, setTrustees] = useState([]);
  const [pingingId, setPingingId] = useState(null);
  const [alertBanner, setAlertBanner] = useState(null); // 'rohan_offline' | null
  const [successMessage, setSuccessMessage] = useState(null);

  // Fetch profile, active vault, and trustees
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        // A. Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (profile) {
          setProfileName(profile.full_name);
        }

        // B. Fetch active vault
        const { data: vault, error: vaultError } = await supabase
          .from('vaults')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (vaultError) throw vaultError;

        if (vault) {
          setActiveVault(vault);
          setHealthScore(vault.safety_score || 70);

          // Calculate remaining days based on last_checkin_at and timer_days
          const lastCheckin = new Date(vault.last_checkin_at);
          const nextCheckinDue = new Date(lastCheckin.getTime() + vault.timer_days * 24 * 60 * 60 * 1000);
          const diffMs = nextCheckinDue.getTime() - new Date().getTime();
          const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          
          setDaysRemaining(diffDays);
          setLogs((prev) => [
            ...prev,
            `Connected to Vault: "${vault.name}"`,
            `Check-in frequency: every ${vault.timer_days} days.`,
            `Current timer status: ${diffDays} days remaining.`
          ]);

          // C. Fetch trustees for this vault
          const { data: trusteesList } = await supabase
            .from('trustees')
            .select('*')
            .eq('vault_id', vault.id)
            .order('shard_index', { ascending: true });

          if (trusteesList && trusteesList.length > 0) {
            setTrustees(trusteesList.map(t => ({
              id: t.id,
              name: t.name,
              email: t.email,
              shard: `Shard ${t.shard_index}`,
              status: 'Online'
            })));
          }
        } else {
          setLogs((prev) => [
            ...prev,
            "Notice: No active vault envelope configured. Please complete setup."
          ]);
        }
      } catch (err) {
        console.error("Dashboard load failed:", err);
      }
    };

    loadDashboardData();
  }, [navigate]);

  // Real Database Check-in (updates last_checkin_at timestamp)
  const handleQuickCheckin = async () => {
    setCheckingIn(true);
    setLogs((prev) => [...prev, "Contacting database to verify identity signature..."]);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No active session.");

      const now = new Date().toISOString();

      if (activeVault) {
        const { error } = await supabase
          .from('vaults')
          .update({ last_checkin_at: now })
          .eq('owner_id', user.id);

        if (error) throw error;

        setDaysRemaining(activeVault.timer_days);
        
        setLogs((prev) => [
          ...prev,
          "Identity verification successful.",
          `Database synced: last_checkin_at reset at ${new Date(now).toLocaleTimeString()}.`,
          `Switch timer successfully reset: ${activeVault.timer_days} days remaining.`
        ]);
      } else {
        setTimeout(() => {
          setDaysRemaining(30);
          setLogs((prev) => [...prev, "Fallback Check-in verified. (Demo mode)"]);
          setCheckingIn(false);
        }, 1000);
      }
    } catch (err) {
      console.error("Database check-in failed:", err);
      setLogs((prev) => [...prev, `Check-in failed: ${err.message}`]);
    } finally {
      if (activeVault) {
        setCheckingIn(false);
      }
    }
  };

  const handleAddFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAddingFile(true);
    setLogs((prev) => [...prev, `[Owner Activity] Preparing to append "${file.name}" to vault...`]);

    try {
      // 1. Fetch trustees data for the active vault
      const { data: trusteesList, error: trusteesError } = await supabase
        .from('trustees')
        .select('*')
        .eq('vault_id', activeVault.id);

      if (trusteesError || !trusteesList || trusteesList.length === 0) {
        throw new Error("No configured trustees found to secure the new file.");
      }

      // 2. Generate a NEW AES Key for this new file
      setLogs((prev) => [...prev, "Generating unique cryptographic key for the new file..."]);
      const aesKeyBytes = generateAESKeyBytes();
      
      const fileBytes = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(new Uint8Array(event.target.result));
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
      });

      const { encryptedBytes, iv } = await encryptFile(fileBytes, aesKeyBytes);

      setLogs((prev) => [...prev, "Uploading encrypted payload to secure cloud storage..."]);
      const { data: { user } } = await supabase.auth.getUser();
      const filePath = `payloads/${user.id}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('vaults')
        .upload(filePath, encryptedBytes, {
          contentType: 'application/octet-stream',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Split new AES key into 3 shards
      const rawShards = splitSecret(aesKeyBytes, 2, 3);

      setLogs((prev) => [...prev, "Distributing encrypted shards to trustee registry..."]);
      for (const t of trusteesList) {
        const sIndex = t.shard_index;
        const shardIndex0 = sIndex - 1;
        
        let parsedShard = { publicKeyJWK: null, encryptedShards: [] };
        if (t.shard.startsWith('{')) {
          parsedShard = JSON.parse(t.shard);
        } else {
          // Backward compatibility
          parsedShard.encryptedShards = [t.shard];
        }

        if (!parsedShard.publicKeyJWK) {
          throw new Error("This vault was created under the old single-file schema. To enable adding files, please re-seal it once in the Setup Wizard (your settings and trustees will be loaded automatically!).");
        }

        const pubKey = await importKeyJWK(
          parsedShard.publicKeyJWK,
          { name: "RSA-OAEP", hash: "SHA-256" },
          ["encrypt"]
        );

        const newEncShard = await rsaEncrypt(pubKey, rawShards[shardIndex0].data);
        parsedShard.encryptedShards.push(bytesToHex(newEncShard));

        const { error: updateTrusteeErr } = await supabase
          .from('trustees')
          .update({ shard: JSON.stringify(parsedShard) })
          .eq('id', t.id);

        if (updateTrusteeErr) throw updateTrusteeErr;
      }

      setLogs((prev) => [...prev, "Updating vault file records catalog..."]);
      let names = [];
      let paths = [];
      let ivs = [];

      if (activeVault.name.startsWith('[')) {
        names = JSON.parse(activeVault.name);
        paths = JSON.parse(activeVault.encrypted_file_path);
        ivs = JSON.parse(activeVault.iv);
      } else {
        names = [activeVault.name];
        paths = [activeVault.encrypted_file_path];
        ivs = [activeVault.iv];
      }

      names.push(file.name);
      paths.push(filePath);
      ivs.push(bytesToHex(iv));

      const now = new Date().toISOString();
      const { error: updateVaultErr } = await supabase
        .from('vaults')
        .update({
          name: JSON.stringify(names),
          encrypted_file_path: JSON.stringify(paths),
          iv: JSON.stringify(ivs),
          last_checkin_at: now
        })
        .eq('id', activeVault.id);

      if (updateVaultErr) throw updateVaultErr;

      setDaysRemaining(activeVault.timer_days);
      setActiveVault((prev) => ({
        ...prev,
        name: JSON.stringify(names),
        encrypted_file_path: JSON.stringify(paths),
        iv: JSON.stringify(ivs),
        last_checkin_at: now
      }));

      setLogs((prev) => [
        ...prev,
        `✓ File "${file.name}" successfully appended to your sealed vault!`,
        `✓ Encrypted key shards distributed to trustees. No new downloads required for trustees!`,
        `✓ Proof of Life check-in triggered: switch timer reset to ${activeVault.timer_days} days remaining.`
      ]);

      setSuccessMessage(`File "${file.name}" successfully added to your secure sealed vault!`);
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);

    } catch (err) {
      console.error("Add file failed:", err);
      setLogs((prev) => [...prev, `Error adding file: ${err.message}`]);
      alert(`Error adding file: ${err.message}`);
    } finally {
      setAddingFile(false);
    }
  };

  // Ping check simulation for trustee
  const handlePingTrustee = (id, name) => {
    setPingingId(id);
    setLogs((prev) => [...prev, `Trustee Readiness Agent → Verifying secure channel to ${name}...`]);

    setTimeout(() => {
      setPingingId(null);
      if (id === trustees[2]?.id) {
        setTrustees((prev) => prev.map(t => t.id === id ? { ...t, status: 'Unresponsive' } : t));
        setHealthScore((prev) => Math.max(70, prev - 20));
        setAlertBanner('rohan_offline');
        setLogs((prev) => [
          ...prev, 
          `Trustee Readiness Agent → Connection timeout. No response received from ${name}.`,
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
      setTrustees((prev) => prev.map((t, idx) => idx === 2 ? { ...t, name: 'Karan Nair', email: 'karan@nair.in', status: 'Online' } : t));
      setHealthScore(activeVault ? activeVault.safety_score : 94);
      setAlertBanner(null);
      setLogs((prev) => [
        ...prev, 
        `Trustee Readiness Agent → Backup trustee Karan Nair promoted.`,
        `Onboarding Health Agent → Vault safety index restored.`
      ]);
    }, 1200);
  };

  // Synchronous + Asynchronous Instant Sign Out
  const handleSignOutInstant = async () => {
    // Clear all supabase local storage items instantly
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-')) {
        localStorage.removeItem(key);
      }
    }
    navigate('/login');
    // Call Supabase cloud signout in background asynchronously
    supabase.auth.signOut().catch(console.error);
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

      {/* AMBIENT BACKGROUND GLOWS */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-radial-gradient from-white/[0.015] to-transparent pointer-events-none blur-3xl z-0" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-radial-gradient from-white/[0.01] to-transparent pointer-events-none blur-3xl z-0" />

      {/* PREMIUM FULL-WIDTH GLASS NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#030304]/80 backdrop-blur-xl border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center shadow-2xl transition-all duration-300">
        <Logo />
        <div className="flex items-center gap-6 text-xs font-semibold">
          {profileName && (
            <span className="text-white uppercase tracking-widest font-extrabold text-[10px] bg-white/[0.04] border border-white/10 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.02)]">
              Agent: {profileName}
            </span>
          )}
          <span className="text-textMuted font-mono text-[10px]">
            Vault: {activeVault ? activeVault.id.slice(0, 8).toUpperCase() : 'None'}
          </span>
          <button 
            onClick={handleSignOutInstant}
            className="px-3.5 py-1.5 border border-red-500/20 rounded-full bg-red-500/[0.03] hover:bg-red-500/10 hover:border-red-500/40 text-red-400 hover:text-red-300 transition-all duration-300 cursor-pointer text-[10px] font-bold tracking-wider uppercase shadow-[0_0_15px_rgba(239,68,68,0.02)]"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 flex-grow max-w-7xl mx-auto w-full px-6 pt-24 pb-16 grid lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN: COUNTDOWN RING & TELEMETRY */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-forestGreen/10 border border-forestGreen/30 p-4 rounded-xl text-left text-xs text-forestGreen flex items-center gap-2.5 shadow-[0_0_20px_rgba(16,185,129,0.05)]"
              >
                <CheckCircle className="w-4 h-4 text-forestGreen shrink-0" />
                <div className="font-sans font-semibold uppercase tracking-wider text-[11px]">
                  {successMessage}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Main Vault Switch widget */}
          <div className="bg-[#08080B]/85 border border-white/5 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-around gap-6 glass-panel relative overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.015)] glint-effect">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
            
            {/* Countdown SVG progress ring */}
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle 
                  cx="50" 
                  cy="50" 
                  r="42" 
                  stroke="rgba(255,255,255,0.01)" 
                  strokeWidth="5" 
                  fill="transparent" 
                />
                <motion.circle 
                  cx="50" 
                  cy="50" 
                  r="42" 
                  stroke="#FFFFFF" 
                  strokeWidth="5" 
                  fill="transparent" 
                  strokeDasharray="264"
                  animate={{ strokeDashoffset: activeVault ? (264 - (264 * daysRemaining) / activeVault.timer_days) : 0 }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                />
              </svg>
              
              <div className="absolute flex flex-col items-center justify-center font-sans">
                <span className="text-5xl font-black text-textWhite tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">{daysRemaining}</span>
                <span className="text-[9px] text-textMuted uppercase tracking-widest mt-1.5 font-bold">Days Left</span>
              </div>
            </div>

            {/* Quick check-in panel */}
            <div className="flex flex-col text-left gap-5 max-w-xs w-full relative z-10">
              <div>
                <span className="text-[10px] text-white/50 uppercase tracking-widest block font-bold mb-1">
                  Telemetry status nominal
                </span>
                <h2 className="font-sans font-extrabold text-xl text-textWhite uppercase tracking-tight leading-none">
                  Welcome Back, {profileName.split(' ')[0] || 'Agent'}
                </h2>
                <p className="text-textMuted text-xs mt-2.5 leading-relaxed font-light">
                  {activeVault ? (
                    `Active Envelope: "${activeVault.name.startsWith('[') ? JSON.parse(activeVault.name).join(', ') : activeVault.name}". Clear check-in triggers to lock active wellness status.`
                  ) : (
                    "No vault envelope configured. Please complete setup in the builder wizard."
                  )}
                </p>
                  <div className="flex flex-col gap-2.5">
                  {activeVault ? (
                    <>
                      <button 
                        onClick={handleQuickCheckin}
                        disabled={checkingIn || activeVault.iv === 'FROZEN_COLLUSION'}
                        className="w-full py-3.5 bg-white text-black hover:bg-zinc-200 hover:shadow-[0_0_25px_rgba(255,255,255,0.15)] font-bold text-xs tracking-widest rounded-full transition-all duration-300 uppercase flex items-center justify-center gap-2 cursor-pointer border-0 shadow-lg disabled:opacity-40"
                      >
                        {checkingIn ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span>Reset Custody Switch</span>
                        )}
                      </button>
                      {activeVault.iv !== 'FROZEN_COLLUSION' && (
                        <Link to="/checkin" className="text-center text-[9px] text-textMuted hover:text-white transition-all font-bold uppercase tracking-wider flex items-center justify-center gap-1 mt-1 hover:underline">
                          Or execute Wellness chat verification →
                        </Link>
                      )}

                      <input 
                        type="file" 
                        ref={addFileInputRef} 
                        onChange={handleAddFileChange} 
                        className="hidden" 
                      />
                      <button 
                        onClick={() => addFileInputRef.current.click()}
                        disabled={addingFile || activeVault.iv === 'FROZEN_COLLUSION'}
                        className="w-full py-3 border border-dashed border-white/10 hover:border-white/30 rounded-full bg-white/[0.01] hover:bg-white/[0.04] text-textMuted hover:text-white font-bold text-[10px] tracking-widest transition-all duration-300 uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-inner mt-2"
                      >
                        {addingFile ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-3 h-3" />
                            <span>Add File to Vault</span>
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link 
                        to="/setup"
                        className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-black hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] font-extrabold text-xs tracking-widest rounded-full transition-all duration-300 uppercase flex items-center justify-center gap-2 cursor-pointer border-0 shadow-lg animate-pulse"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>Initialize Secure Vault</span>
                      </Link>
                      <span className="text-center text-[8px] text-amber-500 font-extrabold uppercase tracking-widest mt-1.5 animate-pulse">
                        ⚠️ Action Required: Setup Capsule to Start Switch
                      </span>
                    </>
                  )}
                </div>

                {activeVault && activeVault.is_stale && (
                  <div className="bg-amber-950/20 border border-amber-900/35 p-3 rounded-xl text-[9px] text-amber-400 uppercase tracking-wide leading-relaxed mt-3 flex flex-col gap-1 font-bold shadow-[0_0_20px_rgba(245,158,11,0.03)] text-left">
                    <span>⚠️ CAPSULE STALE WARNING [AG-03]: Your '{activeVault.category}' vault was uploaded more than the freshness threshold. Please configure/update your files to prevent obsolete credentials.</span>
                  </div>
                )}

                {activeVault && activeVault.iv === 'FROZEN_COLLUSION' && (
                  <div className="bg-red-950/40 border border-red-900/45 p-3.5 rounded-xl text-[9px] text-red-400 uppercase tracking-wide leading-relaxed mt-3 flex flex-col gap-1.5 font-bold shadow-[0_0_30px_rgba(239,68,68,0.15)] text-left animate-pulse">
                    <span>🔒 SECURITY ALERT: VAULT FROZEN [AG-05]</span>
                    <span>Anomalous concurrent accesses were detected from identical IPs or geographically impossible timeframes. Key decryption is disabled.</span>
                  </div>
                )}
                </div>

            </div>

          </div>

          {/* Diagnostics terminal logs */}
          <div className="bg-[#050508]/90 border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col flex-grow min-h-[250px]">
            <div className="bg-[#0C0D1A]/80 border-b border-white/5 px-4 py-3.5 flex items-center justify-between text-xs text-textMuted">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-white" />
                <span className="font-bold tracking-wider uppercase text-[10px]">Diagnostics telemetry logs</span>
              </div>
              <span className="text-[9px] tracking-wider text-forestGreen font-bold bg-forestGreen/10 border border-forestGreen/20 px-2 py-0.5 rounded-full">ACTIVE</span>
            </div>
            <div className="p-4 text-[10px] text-[#A2A2AD] flex flex-col gap-2.5 text-left bg-black/45 flex-grow overflow-y-auto max-h-[300px] scrollbar-none font-mono">
              {logs.map((log, index) => (
                <div key={index} className="flex gap-2.5 items-start">
                  <span className="text-white/30 select-none font-bold">❯</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: HEALTH METER & TRUSTEE STATUS */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Vault Health Card */}
          <div className="bg-[#0A0A12]/40 border border-white/5 rounded-2xl p-5 text-left flex flex-col gap-4 shadow-2xl backdrop-blur-sm glass-card relative overflow-hidden glint-effect">
            <div className="flex justify-between items-center border-b border-white/5 pb-2.5 text-[9px] text-textMuted uppercase font-bold tracking-wider">
              <span>Vault safety index</span>
              <span className="text-white font-extrabold">{activeVault ? 'Active' : 'Unsealed'}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-4xl font-black text-gradient tracking-tight">{healthScore}/100</span>
                <span className="text-[9px] text-textMuted uppercase mt-0.5 font-bold tracking-wider">Security Grade</span>
              </div>
              <Shield className="w-8 h-8 text-white/20" />
            </div>

            <div className="text-[10px] text-textMuted flex flex-col gap-2.5 uppercase font-bold tracking-wider">
              <div className="flex items-center gap-2.5">
                <CheckCircle className={`w-4 h-4 ${activeVault ? 'text-forestGreen' : 'text-[#EF4444]'}`} />
                <span className={activeVault ? 'text-white' : 'text-textMuted'}>{activeVault ? '3 Trustees configured' : 'Trustees unassigned'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle className={`w-4 h-4 ${activeVault ? 'text-forestGreen' : 'text-[#EF4444]'}`} />
                <span className={activeVault ? 'text-white' : 'text-textMuted'}>{activeVault ? 'Payload encrypted locally' : 'No file upload'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle className={`w-4 h-4 ${activeVault ? 'text-forestGreen' : 'text-[#EF4444]'}`} />
                <span className={activeVault ? 'text-white' : 'text-textMuted'}>{activeVault ? 'RAG manuals generated' : 'Manuals pending'}</span>
              </div>
            </div>
          </div>

          {/* Trustee Network Monitor */}
          <div className="bg-[#0A0A12]/40 border border-white/5 rounded-2xl p-5 text-left flex flex-col gap-4 shadow-2xl backdrop-blur-sm glass-card relative overflow-hidden">
            <div className="flex justify-between items-center border-b border-white/5 pb-2.5 text-[9px] text-textMuted uppercase font-bold tracking-wider">
              <span>Key trustees</span>
              <span className="font-extrabold text-white">2 of 3 threshold</span>
            </div>

            <div className="flex flex-col gap-3">
              {trustees.length === 0 ? (
                <div className="text-[10px] text-textMuted uppercase text-center py-6 border border-dashed border-white/5 rounded-xl font-semibold">
                  No trustees configured yet.
                </div>
              ) : (
                trustees.map((t) => (
                  <div key={t.id} className="flex flex-col gap-2 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 font-sans">
                        <div className="w-8 h-8 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center shadow-lg">
                          <Key className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-textWhite">{t.name}</span>
                          <span className="text-[9px] text-textMuted font-semibold tracking-wide truncate max-w-[125px] mt-0.5">{t.shard} · {t.email}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 font-sans">
                        <button 
                          onClick={() => handlePingTrustee(t.id, t.name)}
                          disabled={pingingId !== null || !activeVault}
                          className="bg-white/5 hover:bg-white/10 hover:border-white/20 border border-white/10 px-2.5 py-1 rounded text-[9px] uppercase text-textWhite font-bold transition-all cursor-pointer disabled:opacity-40"
                        >
                          {pingingId === t.id ? (
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <span>Ping</span>
                          )}
                        </button>
                        
                        <div className={`flex items-center gap-1.5 text-[9px] font-bold uppercase ${t.status === 'Online' ? 'text-forestGreen' : 'text-red-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'Online' ? 'bg-forestGreen shadow-[0_0_8px_#10B981]' : 'bg-red-500 animate-pulse'}`} />
                          <span>{t.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {alertBanner === 'rohan_offline' && (
                <div className="bg-red-950/20 border border-red-900/35 p-3.5 rounded-xl text-[10px] text-red-400 uppercase tracking-wide leading-relaxed mt-2 flex flex-col gap-2 font-bold shadow-[0_0_20px_rgba(239,68,68,0.03)] animate-pulse">
                  <span>Alert: Trustee Rohan Iyer is unresponsive. Safety index compromised.</span>
                  <button 
                    onClick={handlePromoteBackup}
                    className="w-full bg-red-500/20 hover:bg-red-500/35 border border-red-500/40 text-red-200 py-2 rounded-full text-[9px] font-extrabold uppercase transition-colors cursor-pointer"
                  >
                    Promote Backup Trustee (Karan Nair)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick links settings */}
          <div className="grid grid-cols-2 gap-3 text-xs font-bold uppercase tracking-wider">
            <Link 
              to="/setup" 
              className={`glass-card p-4 rounded-xl text-center flex flex-col justify-center items-center gap-2 transition-all hover:bg-white/[0.01] ${
                !activeVault 
                  ? 'border-amber-500/30 hover:border-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.15)] bg-amber-500/[0.01] animate-pulse' 
                  : 'border-white/5 hover:border-white/15'
              }`}
            >
              <Database className={`w-4.5 h-4.5 ${!activeVault ? 'text-amber-400' : 'text-white'}`} />
              <span className={`text-[9px] mt-1 font-bold ${!activeVault ? 'text-amber-400' : 'text-textWhite'}`}>Configure Vault</span>
            </Link>
            <Link to="/agents" className="glass-card border border-white/5 hover:border-white/15 p-4 rounded-xl text-center flex flex-col justify-center items-center gap-2 transition-all hover:bg-white/[0.01]">
              <Shield className="w-4.5 h-4.5 text-white" />
              <span className="text-[9px] text-textWhite mt-1">Agent Matrix</span>
            </Link>
          </div>

        </div>

      </main>

      {/* Footer copyright */}
      <footer className="relative z-10 w-full py-5 px-6 border-t border-white/5 bg-[#050506]/40 font-mono text-[9px] text-[#52525B]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <span>DEADDROP SECURITY DASHBOARD</span>
          <span>© 2026 SERVICES.</span>
        </div>
      </footer>

    </div>
  );
}
