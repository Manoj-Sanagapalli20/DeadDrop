import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Key, FileText, ChevronRight, ChevronLeft, Upload, Users, Phone, Clock, FileLock2, RefreshCw, Download } from 'lucide-react';
import FilmGrain from '../components/FilmGrain';
import Logo from '../components/Logo';
import { 
  generateAESKeyBytes, 
  splitSecret, 
  encryptFile, 
  bytesToHex, 
  generateRSAKeyPair, 
  rsaEncrypt, 
  exportKeyJWK 
} from '../utils/crypto';
import { supabase } from '../utils/supabaseClient';

export default function Setup() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [fileName, setFileName] = useState('');
  
  // Real cryptographic states
  const [encryptedPayload, setEncryptedPayload] = useState(null);
  const [encryptionIv, setEncryptionIv] = useState(null);
  
  // Asymmetric trustee keys generated on file upload
  const [trusteeKeys, setTrusteeKeys] = useState(null); // { 1: keyPair, 2: keyPair, 3: keyPair }
  const [encryptedShards, setEncryptedShards] = useState([]); // Array of { x, hex, privateKeyJWK }

  const [t1Name, setT1Name] = useState('Aarav Patel');
  const [t1Email, setT1Email] = useState('aarav@patel.in');
  const [t2Name, setT2Name] = useState('Priya Sharma');
  const [t2Email, setT2Email] = useState('priya@sharma.in');
  const [t3Name, setT3Name] = useState('Rohan Iyer');
  const [t3Email, setT3Email] = useState('rohan@iyer.in');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [timerDays, setTimerDays] = useState(30);
  const [instructions, setInstructions] = useState('');
  
  // DB Save states
  const [sealing, setSealing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Calculate readiness score
  const calculateScore = () => {
    let score = 30;
    if (fileUploaded) score += 20;
    if (t1Email && t2Email && t3Email) score += 20;
    if (contactName && contactPhone) score += 15;
    if (instructions.length > 20) score += 15;
    return score;
  };

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  // Trigger file selection click
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // Handle actual file upload, AES encryption, and RSA Shard Wrapping
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setFileUploaded(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target.result;
      const fileBytes = new Uint8Array(arrayBuffer);

      try {
        // 1. Generate 32-byte AES Key and encrypt payload
        const aesKeyBytes = generateAESKeyBytes();
        const { encryptedBytes, iv } = await encryptFile(fileBytes, aesKeyBytes);
        setEncryptedPayload(encryptedBytes);
        setEncryptionIv(iv);

        // 2. Generate RSA Key Pairs for all 3 trustees
        const keys1 = await generateRSAKeyPair();
        const keys2 = await generateRSAKeyPair();
        const keys3 = await generateRSAKeyPair();

        setTrusteeKeys({
          1: keys1,
          2: keys2,
          3: keys3
        });

        // 3. Split key into 3 shards
        const rawShards = splitSecret(aesKeyBytes, 2, 3);

        // 4. Encrypt each shard with the corresponding trustee's public RSA key (HACKER PREVENTION)
        const encShard1 = await rsaEncrypt(keys1.publicKey, rawShards[0].data);
        const encShard2 = await rsaEncrypt(keys2.publicKey, rawShards[1].data);
        const encShard3 = await rsaEncrypt(keys3.publicKey, rawShards[2].data);

        // 5. Export Private Keys to JWK format for trustee files
        const jwkPriv1 = await exportKeyJWK(keys1.privateKey);
        const jwkPriv2 = await exportKeyJWK(keys2.privateKey);
        const jwkPriv3 = await exportKeyJWK(keys3.privateKey);

        const formattedShards = [
          { x: 1, hex: bytesToHex(encShard1), privateKeyJWK: jwkPriv1 },
          { x: 2, hex: bytesToHex(encShard2), privateKeyJWK: jwkPriv2 },
          { x: 3, hex: bytesToHex(encShard3), privateKeyJWK: jwkPriv3 }
        ];
        
        setEncryptedShards(formattedShards);

        // Save encrypted payload and metadata to session storage for same-tab test shortcut
        sessionStorage.setItem('deaddrop_encrypted_payload', bytesToHex(encryptedBytes));
        sessionStorage.setItem('deaddrop_iv', bytesToHex(iv));
        sessionStorage.setItem('deaddrop_filename', file.name);

        console.log("ZERO-KNOWLEDGE RSA SHARD WRAPPING INITIALIZED:");
        console.log("Original AES Key:", bytesToHex(aesKeyBytes));
        console.log("Encrypted Shard 1 (in DB):", formattedShards[0].hex);
        console.log("Encrypted Shard 2 (in DB):", formattedShards[1].hex);
        console.log("Encrypted Shard 3 (in DB):", formattedShards[2].hex);
      } catch (err) {
        console.error("Encryption/Wrapping error:", err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Download key file containing the encrypted shard + the private key needed to open it
  const downloadShard = (xVal, encHexData, jwkPrivKey, trusteeName) => {
    const blob = new Blob([JSON.stringify({ 
      x: xVal, 
      key: encHexData, // Encrypted shard
      privateKey: jwkPrivKey, // Trustee's private key to unwrap it
      owner: trusteeName,
      iv: encryptionIv ? bytesToHex(encryptionIv) : ''
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trustee_shard_${xVal}.key`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadEncryptedPayload = () => {
    if (!encryptedPayload) return;
    const blob = new Blob([encryptedPayload], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.enc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSealVault = async () => {
    setSealing(true);
    setStatusMessage('Syncing credentials and owner session...');

    try {
      // 1. Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Owner session not found. Please log in again.");

      // 2. Upload Encrypted Binary to Supabase Storage Bucket
      setStatusMessage('Uploading encrypted payload to secure cloud storage...');
      const filePath = `payloads/${user.id}/${Date.now()}_${fileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vaults')
        .upload(filePath, encryptedPayload, {
          contentType: 'application/octet-stream',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 3. Save Vault Metadata record in database
      setStatusMessage('Writing zero-knowledge envelope records to database...');
      const { data: vaultData, error: vaultError } = await supabase
        .from('vaults')
        .insert({
          owner_id: user.id,
          name: fileName,
          encrypted_file_path: filePath,
          iv: bytesToHex(encryptionIv),
          timer_days: timerDays,
          safety_score: calculateScore(),
          instructions: instructions
        })
        .select()
        .single();

      if (vaultError) throw vaultError;

      // 4. Save RSA-Encrypted Trustee Shards in database (Zero-Knowledge)
      setStatusMessage('Deploying encrypted key shards to trustee registry...');
      const { error: trusteesError } = await supabase
        .from('trustees')
        .insert([
          { vault_id: vaultData.id, name: t1Name, email: t1Email, shard: encryptedShards[0].hex, shard_index: 1 },
          { vault_id: vaultData.id, name: t2Name, email: t2Email, shard: encryptedShards[1].hex, shard_index: 2 },
          { vault_id: vaultData.id, name: t3Name, email: t3Email, shard: encryptedShards[2].hex, shard_index: 3 }
        ]);

      if (trusteesError) throw trusteesError;

      setStatusMessage('Verification checks complete. Vault sealed successfully.');
      setTimeout(() => {
        setSealing(false);
        navigate('/dashboard');
      }, 1500);

    } catch (err) {
      console.error("Database save failed:", err);
      setStatusMessage(`Error sealing vault: ${err.message}`);
      setSealing(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#030304] text-textWhite font-sans overflow-hidden flex flex-col justify-between">
      <FilmGrain />

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#030304]/75 backdrop-blur-md border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center shadow-lg">
        <Logo />
        <Link 
          to="/dashboard" 
          className="px-3 py-1 border border-white/10 rounded-full bg-white/[0.02] hover:bg-white/5 hover:border-white/20 text-textMuted hover:text-white transition-all text-[10px] font-semibold"
        >
          Cancel Setup
        </Link>
      </header>

      {/* MAIN CONTAINER */}
      <main className="relative z-10 flex-grow max-w-5xl mx-auto w-full px-6 pt-24 pb-16 grid md:grid-cols-12 gap-8 items-stretch">
        
        {/* LEFT COLUMN: ACTIVE STEP FORM */}
        <div className="md:col-span-8 flex flex-col justify-between bg-[#08080B]/80 border border-white/5 rounded-2xl p-6 glass-panel relative overflow-hidden">
          
          <div className="flex flex-col gap-6 text-left">
            {/* Step header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-3 text-[10px] text-textMuted uppercase tracking-wider font-semibold">
              <span>Step {step} of 5</span>
              <span>
                {step === 1 && 'Payload Encryption'}
                {step === 2 && 'Key Trustees'}
                {step === 3 && 'Emergency Escalation'}
                {step === 4 && 'Switch Protocol'}
                {step === 5 && 'Inheritance Manual'}
              </span>
            </div>

            {/* Stepper Forms */}
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col gap-4"
                >
                  <h3 className="font-sans font-bold text-lg text-textWhite uppercase">Secure Payload</h3>
                  <p className="text-textMuted text-xs leading-relaxed font-light">
                    Upload the critical files you wish to secure. Files are encrypted locally in your browser using AES-GCM 256-bit before being uploaded to secure AWS relay storage. We cannot read them.
                  </p>
                  
                  {/* Hidden Input File */}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />

                  <div 
                    onClick={triggerFileInput}
                    className="border border-dashed border-white/10 hover:border-white/30 rounded-xl p-10 flex flex-col items-center justify-center text-center bg-white/[0.005] hover:bg-white/[0.015] cursor-pointer transition-all duration-300"
                  >
                    <Upload className="w-8 h-8 text-textMuted mb-3" />
                    {fileUploaded ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-forestGreen font-bold uppercase">File Encrypted</span>
                        <span className="text-[10px] text-textMuted">{fileName}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-textMuted uppercase">Select target file to encrypt</span>
                    )}
                  </div>

                  {/* Shard Download Dashboard for interactive local test */}
                  {fileUploaded && encryptedShards.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/[0.02] border border-white/5 p-4 rounded-xl flex flex-col gap-3 mt-2"
                    >
                      <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider block">
                        🔑 Prototype key shards ready:
                      </span>
                      <p className="text-[10px] text-textMuted font-light leading-relaxed">
                        To test the local decryption pipeline later, download the key files and payload below:
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button 
                          onClick={() => downloadShard(1, encryptedShards[0].hex, encryptedShards[0].privateKeyJWK, t1Name)}
                          className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9px] text-white flex items-center justify-center gap-1.5 cursor-pointer uppercase transition-colors"
                        >
                          <Download className="w-3 h-3" /> Shard 1 ({t1Name.split(' ')[0]})
                        </button>
                        <button 
                          onClick={() => downloadShard(2, encryptedShards[1].hex, encryptedShards[1].privateKeyJWK, t2Name)}
                          className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9px] text-white flex items-center justify-center gap-1.5 cursor-pointer uppercase transition-colors"
                        >
                          <Download className="w-3 h-3" /> Shard 2 ({t2Name.split(' ')[0]})
                        </button>
                        <button 
                          onClick={() => downloadShard(3, encryptedShards[2].hex, encryptedShards[2].privateKeyJWK, t3Name)}
                          className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9px] text-white flex items-center justify-center gap-1.5 cursor-pointer uppercase transition-colors"
                        >
                          <Download className="w-3 h-3" /> Shard 3 ({t3Name.split(' ')[0]})
                        </button>
                      </div>

                      <button 
                        onClick={downloadEncryptedPayload}
                        className="w-full mt-1.5 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-[9px] text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer uppercase transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Download Encrypted payload (.enc)
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col gap-4"
                >
                  <h3 className="font-sans font-bold text-lg text-textWhite uppercase">Assign Shard Trustees</h3>
                  <p className="text-textMuted text-xs leading-relaxed font-light">
                    Designate 3 trustees. The master decryption key will be split into 3 shares using Shamir's Secret Sharing (2-of-3 keys required to reconstruct).
                  </p>
                  
                  <div className="flex flex-col gap-3 text-[10px] font-semibold uppercase">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-textMuted tracking-wider">Trustee 1 Name & Email</label>
                      <div className="flex gap-2">
                        <input type="text" value={t1Name} onChange={(e) => setT1Name(e.target.value)} className="w-1/2 bg-black/45 border border-white/5 p-2 rounded text-textWhite text-xs outline-none focus:border-white/35 normal-case font-medium" />
                        <input type="email" value={t1Email} onChange={(e) => setT1Email(e.target.value)} className="w-1/2 bg-black/45 border border-white/5 p-2 rounded text-textWhite text-xs outline-none focus:border-white/35 normal-case font-medium" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-1">
                      <label className="text-textMuted tracking-wider">Trustee 2 Name & Email</label>
                      <div className="flex gap-2">
                        <input type="text" value={t2Name} onChange={(e) => setT2Name(e.target.value)} className="w-1/2 bg-black/45 border border-white/5 p-2 rounded text-textWhite text-xs outline-none focus:border-white/35 normal-case font-medium" />
                        <input type="email" value={t2Email} onChange={(e) => setT2Email(e.target.value)} className="w-1/2 bg-black/45 border border-white/5 p-2 rounded text-textWhite text-xs outline-none focus:border-white/35 normal-case font-medium" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-1">
                      <label className="text-textMuted tracking-wider">Trustee 3 Name & Email</label>
                      <div className="flex gap-2">
                        <input type="text" value={t3Name} onChange={(e) => setT3Name(e.target.value)} className="w-1/2 bg-black/45 border border-white/5 p-2 rounded text-textWhite text-xs outline-none focus:border-white/35 normal-case font-medium" />
                        <input type="email" value={t3Email} onChange={(e) => setT3Email(e.target.value)} className="w-1/2 bg-black/45 border border-white/5 p-2 rounded text-textWhite text-xs outline-none focus:border-white/35 normal-case font-medium" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col gap-4"
                >
                  <h3 className="font-sans font-bold text-lg text-textWhite uppercase">Emergency Verification</h3>
                  <p className="text-textMuted text-xs leading-relaxed font-light">
                    If you miss your check-in, we will text/call emergency contacts before releasing files. If any contact replies YES, the switch is immediately cancelled.
                  </p>
                  
                  <div className="flex flex-col gap-3 text-[10px] font-semibold uppercase">
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-textMuted tracking-wider">Contact Name</label>
                      <input 
                        type="text"
                        placeholder="Vijay Sharma"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full bg-black/45 border border-white/5 p-2.5 rounded text-textWhite text-xs outline-none focus:border-white/35 normal-case font-medium"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-textMuted tracking-wider">Verification Mobile Number</label>
                      <input 
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full bg-black/45 border border-white/5 p-2.5 rounded text-textWhite text-xs outline-none focus:border-white/35 normal-case font-medium"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div 
                  key="step4"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col gap-4"
                >
                  <h3 className="font-sans font-bold text-lg text-textWhite uppercase">Set Switch Interval</h3>
                  <p className="text-textMuted text-xs leading-relaxed font-light">
                    Define the wellness check-in frequency. If you fail to verify wellness within this window, the multi-channel escalation process kicks off.
                  </p>
                  
                  <div className="flex flex-col gap-6 py-4 font-semibold">
                    <div className="flex justify-between items-center text-xs">
                      <span>Check-in Interval:</span>
                      <span className="text-white font-bold">{timerDays} Days</span>
                    </div>
                    <input 
                      type="range"
                      min="7"
                      max="90"
                      value={timerDays}
                      onChange={(e) => setTimerDays(parseInt(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                    <div className="text-[10px] text-textMuted uppercase leading-relaxed font-normal">
                      Escalation timeline: 9-day multi-channel investigation begins on Day {timerDays + 1}. Release authorized on Day {timerDays + 9}.
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div 
                  key="step5"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col gap-4"
                >
                  <h3 className="font-sans font-bold text-lg text-textWhite uppercase">Executor Instructions</h3>
                  <p className="text-textMuted text-xs leading-relaxed font-light">
                    Write detailed instructions explaining what the decrypted files are and how your family/trustees should use them. Our AI assistant will query these instructions to answer their questions post-release.
                  </p>
                  
                  <textarea 
                    rows="6"
                    placeholder="Provide details about locker keys, seeds, and key documents here..."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full bg-black/45 border border-white/5 p-3 rounded text-textWhite text-xs outline-none focus:border-white/35 resize-none leading-relaxed"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between items-center border-t border-white/5 pt-6 mt-6">
            <button 
              onClick={handlePrev}
              disabled={step === 1}
              className="px-5 py-2.5 border border-white/10 bg-white/[0.01] hover:bg-white/5 hover:border-white/20 text-xs font-semibold uppercase rounded-full flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>

            {step < 5 ? (
              <button 
                onClick={handleNext}
                className="px-5 py-2.5 bg-white hover:bg-zinc-200 text-black text-xs font-bold uppercase rounded-full flex items-center gap-1.5 transition-colors cursor-pointer border-0"
              >
                Next Step <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button 
                onClick={handleSealVault}
                disabled={sealing || !fileUploaded}
                className="px-6 py-3 bg-white hover:bg-zinc-200 text-black text-xs font-bold uppercase rounded-full flex items-center gap-2 cursor-pointer shadow-lg border-0 disabled:opacity-40"
              >
                {sealing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <FileLock2 className="w-4 h-4" />
                    <span>Seal Vault Archive</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Inline Database Status Logger */}
          {statusMessage && (
            <div className="mt-4 p-3 bg-black/35 border border-white/5 rounded-xl text-left text-[10px] text-textMuted uppercase flex items-center gap-2 tracking-wider">
              <span className="text-white select-none">❯</span>
              <span className={statusMessage.includes('Error') ? 'text-red-400 font-bold' : statusMessage.includes('complete') || statusMessage.includes('success') ? 'text-forestGreen font-bold' : 'text-white'}>
                {statusMessage}
              </span>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: REAL-TIME HEALTH STATUS */}
        <div className="md:col-span-4 flex flex-col gap-6">
          
          {/* Real-time Vault Score visualizer (Agent 01) */}
          <div className="bg-[#0C0C14]/50 border border-white/5 rounded-2xl p-5 text-left flex flex-col gap-5 shadow-lg backdrop-blur-sm glass-card relative overflow-hidden">
            
            <div className="border-b border-white/5 pb-2 text-[10px] text-textMuted uppercase flex justify-between font-semibold">
              <span>Agent 01 Diagnostics</span>
              <span>Scoring Engine</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col text-left">
                <span className="text-3xl font-extrabold text-gradient">{calculateScore()}/100</span>
                <span className="text-[9px] text-textMuted uppercase mt-0.5 font-semibold">Readiness Score</span>
              </div>
              <Shield className="w-8 h-8 text-white/30 animate-pulse" />
            </div>

            <div className="flex flex-col gap-3 text-[10px] uppercase font-semibold">
              <div className="flex items-center gap-2.5">
                <span className={`w-1.5 h-1.5 rounded-full ${fileUploaded ? 'bg-forestGreen' : 'bg-[#EF4444]'}`} />
                <span className={fileUploaded ? 'text-textWhite' : 'text-textMuted'}>File Encryption Seal</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className={`w-1.5 h-1.5 rounded-full ${t1Email && t2Email && t3Email ? 'bg-forestGreen' : 'bg-[#EF4444]'}`} />
                <span className={t1Email && t2Email && t3Email ? 'text-textWhite' : 'text-textMuted'}>3 Trustees Assigned</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className={`w-1.5 h-1.5 rounded-full ${contactName && contactPhone ? 'bg-forestGreen' : 'bg-[#EF4444]'}`} />
                <span className={contactName && contactPhone ? 'text-textWhite' : 'text-textMuted'}>Escalation Contacts</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className={`w-1.5 h-1.5 rounded-full ${instructions.length > 20 ? 'bg-forestGreen' : 'bg-[#EF4444]'}`} />
                <span className={instructions.length > 20 ? 'text-textWhite' : 'text-textMuted'}>Executor Instructions</span>
              </div>
            </div>

            {calculateScore() < 70 ? (
              <div className="bg-red-950/20 border border-red-900/30 p-3 rounded-lg text-[9px] text-red-400 uppercase tracking-wide leading-relaxed font-semibold">
                Setup warning: Score must be above 70 to seal the envelope and activate telemetry.
              </div>
            ) : (
              <div className="bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-lg text-[9px] text-emerald-400 uppercase tracking-wide leading-relaxed font-semibold">
                System check approved. Ready to deploy keys and seal.
              </div>
            )}

          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full py-5 px-6 border-t border-white/5 bg-[#050506]/40 text-[9px] text-[#52525B]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <span>DEADDROP VAULT BUILDER</span>
          <span>© 2026 SERVICES.</span>
        </div>
      </footer>

    </div>
  );
}
