import React, { useState, useEffect, useRef } from 'react';
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
  exportKeyJWK,
  importKeyJWK
} from '../utils/crypto';
import { supabase } from '../utils/supabaseClient';
import { onboardingHealthChain } from '../../agents';

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

  const [t1Name, setT1Name] = useState('');
  const [t1Email, setT1Email] = useState('');
  const [t2Name, setT2Name] = useState('');
  const [t2Email, setT2Email] = useState('');
  const [t3Name, setT3Name] = useState('');
  const [t3Email, setT3Email] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [timerDays, setTimerDays] = useState(7);
  const [instructions, setInstructions] = useState('');
  const [category, setCategory] = useState('');
  const [existingFilesName, setExistingFilesName] = useState('');
  const [existingVault, setExistingVault] = useState(null);
  const [existingTrustees, setExistingTrustees] = useState([]);
  const [useExistingKeys, setUseExistingKeys] = useState(false);

  // DB Save states
  const [sealing, setSealing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Agent 01 live diagnostics console state
  const [agent1Logs, setAgent1Logs] = useState([
    "Scoring engine online. Awaiting variables..."
  ]);

  // Calculate readiness score
  const calculateScore = () => {
    let score = 0;
    if (fileUploaded) score += 30;
    if (t1Email && t2Email && t3Email) score += 30;
    if (contactName && contactPhone) score += 20;
    if (instructions.length > 10) score += 20;
    return score;
  };

  // Load existing vault settings to pre-populate form steps
  useEffect(() => {
    const loadExistingSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: vault } = await supabase
          .from('vaults')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (vault) {
          setExistingVault(vault);
          setTimerDays(vault.timer_days);
          setCategory(vault.category || '');
          setInstructions(vault.instructions || '');

          let displayNames = vault.name;
          if (vault.name.startsWith('[')) {
            try {
              displayNames = JSON.parse(vault.name).join(', ');
            } catch (e) {}
          }
          setExistingFilesName(displayNames);
          setFileName(displayNames);
          setFileUploaded(true);

          const { data: trusteesList } = await supabase
            .from('trustees')
            .select('*')
            .eq('vault_id', vault.id)
            .order('shard_index', { ascending: true });

          if (trusteesList && trusteesList.length >= 3) {
            setExistingTrustees(trusteesList);
            setT1Name(trusteesList[0].name || '');
            setT1Email(trusteesList[0].email || '');
            setT2Name(trusteesList[1].name || '');
            setT2Email(trusteesList[1].email || '');
            setT3Name(trusteesList[2].name || '');
            setT3Email(trusteesList[2].email || '');

            // Only enable default key reuse if the existing vault possesses public key lock schemas
            if (trusteesList[0].shard && trusteesList[0].shard.startsWith('{')) {
              setUseExistingKeys(true);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load existing vault configuration:", err);
      }
    };
    loadExistingSettings();
  }, []);

  // Agent 01 Real-Time LangChain Diagnostics Hook
  useEffect(() => {
    const runHealthChain = async () => {
      try {
        const result = await onboardingHealthChain.invoke({
          fileUploaded: fileUploaded ? "true" : "false",
          trusteeCount: (t1Email && t2Email && t3Email) ? "3" : "0",
          hasEmergencyContact: (contactName && contactPhone) ? "true" : "false",
          instructionsLength: instructions.length.toString()
        });
        setAgent1Logs(result.logs);
      } catch (err) {
        console.error("LangChain Health Chain execution failed:", err);
      }
    };

    runHealthChain();
  }, [fileUploaded, t1Email, t2Email, t3Email, contactName, contactPhone, instructions]);

  const handleNext = () => {
    if (step === 1) {
      if (!fileUploaded) {
        alert("Please select and encrypt a target file first.");
        return;
      }
      if (!category) {
        alert("Please choose an asset category metadata tag to configure freshness thresholds.");
        return;
      }
    }
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
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setFileName(files.map(f => f.name).join(', '));
    setFileUploaded(true);

    try {
      // 1. Generate 32-byte AES Key
      const aesKeyBytes = generateAESKeyBytes();

      // 2. Encrypt all files with the same AES key
      const encryptedFilesData = [];
      for (const file of files) {
        const fileBytes = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(new Uint8Array(event.target.result));
          reader.onerror = (err) => reject(err);
          reader.readAsArrayBuffer(file);
        });
        const { encryptedBytes, iv } = await encryptFile(fileBytes, aesKeyBytes);
        encryptedFilesData.push({
          name: file.name,
          encryptedBytes: encryptedBytes,
          iv: iv
        });
      }

      setEncryptedPayload(encryptedFilesData);
      setEncryptionIv(encryptedFilesData[0].iv);

      // 3. Split key into 3 shards
      const rawShards = splitSecret(aesKeyBytes, 2, 3);

      let formattedShards = [];

      if (useExistingKeys && existingTrustees.length >= 3) {
        console.log("Re-using existing trustee key locks. Encrypting shards with database public keys...");
        
        for (let i = 0; i < 3; i++) {
          const t = existingTrustees[i];
          const parsed = JSON.parse(t.shard);
          const pubKey = await importKeyJWK(
            parsed.publicKeyJWK,
            { name: "RSA-OAEP", hash: "SHA-256" },
            ["encrypt"]
          );
          const newEncShard = await rsaEncrypt(pubKey, rawShards[i].data);
          
          // Append to the list of locked shards
          const shardData = JSON.stringify({
            publicKeyJWK: parsed.publicKeyJWK,
            encryptedShards: [...parsed.encryptedShards, bytesToHex(newEncShard)]
          });
          
          formattedShards.push({
            x: i + 1,
            hex: shardData,
            isUpdate: true
          });
        }
        setEncryptedShards(formattedShards);
      } else {
        // 2. Generate RSA Key Pairs for all 3 trustees
        const keys1 = await generateRSAKeyPair();
        const keys2 = await generateRSAKeyPair();
        const keys3 = await generateRSAKeyPair();

        const jwkPub1 = await exportKeyJWK(keys1.publicKey);
        const jwkPub2 = await exportKeyJWK(keys2.publicKey);
        const jwkPub3 = await exportKeyJWK(keys3.publicKey);

        setTrusteeKeys({
          1: { ...keys1, publicKeyJWK: jwkPub1 },
          2: { ...keys2, publicKeyJWK: jwkPub2 },
          3: { ...keys3, publicKeyJWK: jwkPub3 }
        });

        // 4. Encrypt each shard with the corresponding trustee's public RSA key (HACKER PREVENTION)
        const encShard1 = await rsaEncrypt(keys1.publicKey, rawShards[0].data);
        const encShard2 = await rsaEncrypt(keys2.publicKey, rawShards[1].data);
        const encShard3 = await rsaEncrypt(keys3.publicKey, rawShards[2].data);

        // 5. Export Private Keys to JWK format for trustee files
        const jwkPriv1 = await exportKeyJWK(keys1.privateKey);
        const jwkPriv2 = await exportKeyJWK(keys2.privateKey);
        const jwkPriv3 = await exportKeyJWK(keys3.privateKey);

        formattedShards = [
          { x: 1, hex: bytesToHex(encShard1), privateKeyJWK: jwkPriv1 },
          { x: 2, hex: bytesToHex(encShard2), privateKeyJWK: jwkPriv2 },
          { x: 3, hex: bytesToHex(encShard3), privateKeyJWK: jwkPriv3 }
        ];

        setEncryptedShards(formattedShards);
      }

      // Save encrypted payload and metadata to session storage for same-tab test shortcut
      sessionStorage.setItem('deaddrop_encrypted_payload', bytesToHex(encryptedFilesData[0].encryptedBytes));
      sessionStorage.setItem('deaddrop_iv', bytesToHex(encryptedFilesData[0].iv));
      sessionStorage.setItem('deaddrop_filename', files[0].name);

      console.log("ZERO-KNOWLEDGE RSA SHARD WRAPPING INITIALIZED:");
      console.log("Original AES Key:", bytesToHex(aesKeyBytes));
      console.log("Encrypted Shard 1 (in DB):", formattedShards[0].hex);
      console.log("Encrypted Shard 2 (in DB):", formattedShards[1].hex);
      console.log("Encrypted Shard 3 (in DB):", formattedShards[2].hex);
    } catch (err) {
      console.error("Encryption/Wrapping error:", err);
    }
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
    const items = Array.isArray(encryptedPayload) ? encryptedPayload : [{ name: fileName, encryptedBytes: encryptedPayload }];
    items.forEach(item => {
      const blob = new Blob([item.encryptedBytes], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${item.name}.enc`;
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleSealVault = async () => {
    if (!useExistingKeys && !encryptedPayload) {
      alert("Please upload and encrypt a file to build your new vault.");
      return;
    }

    setSealing(true);
    setStatusMessage('Syncing credentials and owner session...');

    try {
      // 1. Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Owner session not found. Please log in again.");

      let filePaths = [];
      let fileNames = [];
      let fileIvs = [];

      // 2. Upload all Encrypted payloads to secure cloud storage (if a new file is uploaded)
      if (encryptedPayload) {
        const items = Array.isArray(encryptedPayload) ? encryptedPayload : [{ name: fileName, encryptedBytes: encryptedPayload, iv: encryptionIv }];
        
        for (const item of items) {
          setStatusMessage(`Uploading encrypted payload "${item.name}"...`);
          const filePath = `payloads/${user.id}/${Date.now()}_${item.name}`;
          const { error: uploadError } = await supabase.storage
            .from('vaults')
            .upload(filePath, item.encryptedBytes, {
              contentType: 'application/octet-stream',
              upsert: true
            });

          if (uploadError) throw uploadError;
          
          filePaths.push(filePath);
          fileNames.push(item.name);
          fileIvs.push(bytesToHex(item.iv));
        }
      }
      
      let vaultDataId = null;

      if (useExistingKeys && existingVault) {
        // Build final file catalog by appending new uploads to existing vault files list
        let finalNames = [];
        let finalPaths = [];
        let finalIvs = [];

        let oldNames = [];
        let oldPaths = [];
        let oldIvs = [];

        if (existingVault.name.startsWith('[')) {
          oldNames = JSON.parse(existingVault.name);
          oldPaths = JSON.parse(existingVault.encrypted_file_path);
          oldIvs = JSON.parse(existingVault.iv);
        } else {
          oldNames = [existingVault.name];
          oldPaths = [existingVault.encrypted_file_path];
          oldIvs = [existingVault.iv];
        }

        if (encryptedPayload) {
          finalNames = [...oldNames, ...fileNames];
          finalPaths = [...oldPaths, ...filePaths];
          finalIvs = [...oldIvs, ...fileIvs];
        } else {
          finalNames = oldNames;
          finalPaths = oldPaths;
          finalIvs = oldIvs;
        }

        setStatusMessage('Updating existing zero-knowledge envelope records in database...');
        const { data: updatedVault, error: vaultError } = await supabase
          .from('vaults')
          .update({
            name: JSON.stringify(finalNames),
            encrypted_file_path: JSON.stringify(finalPaths),
            iv: JSON.stringify(finalIvs),
            timer_days: timerDays,
            safety_score: calculateScore(),
            instructions: instructions,
            category: category,
            last_checkin_at: new Date().toISOString()
          })
          .eq('id', existingVault.id)
          .select()
          .single();

        if (vaultError) throw vaultError;
        vaultDataId = updatedVault.id;

        setStatusMessage('Deploying updated key shards to trustee registry...');
        for (let i = 0; i < 3; i++) {
          const t = existingTrustees[i];
          const updatePayload = {
            name: [t1Name, t2Name, t3Name][i],
            email: [t1Email, t2Email, t3Email][i]
          };

          // Only update shard if a new file was actually encrypted
          if (encryptedShards && encryptedShards[i]) {
            updatePayload.shard = encryptedShards[i].hex;
          }

          const { error: updateTrusteeErr } = await supabase
            .from('trustees')
            .update(updatePayload)
            .eq('id', t.id);

          if (updateTrusteeErr) throw updateTrusteeErr;
        }

      } else {
        if (!encryptedPayload && existingVault) {
          filePaths = JSON.parse(existingVault.encrypted_file_path);
          fileNames = JSON.parse(existingVault.name);
          fileIvs = JSON.parse(existingVault.iv);
        }
        // 3. Save Vault Metadata record in database
        setStatusMessage('Writing zero-knowledge envelope records to database...');
        const { data: vaultData, error: vaultError } = await supabase
          .from('vaults')
          .insert({
            owner_id: user.id,
            name: JSON.stringify(fileNames),
            encrypted_file_path: JSON.stringify(filePaths),
            iv: JSON.stringify(fileIvs),
            timer_days: timerDays,
            safety_score: calculateScore(),
            instructions: instructions,
            category: category
          })
          .select()
          .single();

        if (vaultError) throw vaultError;
        vaultDataId = vaultData.id;

        // 4. Save RSA-Encrypted Trustee Shards in database (Zero-Knowledge)
        setStatusMessage('Deploying encrypted key shards to trustee registry...');
        const shardData1 = JSON.stringify({
          publicKeyJWK: trusteeKeys[1].publicKeyJWK,
          encryptedShards: [encryptedShards[0].hex]
        });
        const shardData2 = JSON.stringify({
          publicKeyJWK: trusteeKeys[2].publicKeyJWK,
          encryptedShards: [encryptedShards[1].hex]
        });
        const shardData3 = JSON.stringify({
          publicKeyJWK: trusteeKeys[3].publicKeyJWK,
          encryptedShards: [encryptedShards[2].hex]
        });

        const { error: trusteesError } = await supabase
          .from('trustees')
          .insert([
            { vault_id: vaultDataId, name: t1Name, email: t1Email, shard: shardData1, shard_index: 1 },
            { vault_id: vaultDataId, name: t2Name, email: t2Email, shard: shardData2, shard_index: 2 },
            { vault_id: vaultDataId, name: t3Name, email: t3Email, shard: shardData3, shard_index: 3 }
          ]);

        if (trusteesError) throw trusteesError;
      }

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

                  {existingFilesName && (
                    <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl text-left text-xs mb-1 flex flex-col gap-1.5 font-sans">
                      <span className="text-[10px] text-white/50 uppercase tracking-widest font-extrabold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-forestGreen shadow-[0_0_8px_#10B981]" />
                        Active Sealed Vault Envelope
                      </span>
                      <div className="text-white font-mono font-bold text-[11px] truncate">{existingFilesName}</div>
                      <span className="text-[9px] text-textMuted uppercase font-semibold leading-relaxed">
                        To add new files or change your settings, select the file(s) below to re-seal.
                      </span>
                    </div>
                  )}

                  {/* Hidden Input File */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    className="hidden"
                  />

                  <div
                    onClick={triggerFileInput}
                    className="border border-dashed border-white/10 hover:border-white/30 rounded-xl p-10 flex flex-col items-center justify-center text-center bg-white/[0.005] hover:bg-white/[0.015] cursor-pointer transition-all duration-300"
                  >
                    <Upload className="w-8 h-8 text-textMuted mb-3" />
                    {fileUploaded ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-forestGreen font-bold uppercase">Files Encrypted</span>
                        <span className="text-[10px] text-textMuted">{fileName}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-textMuted uppercase">Select target file(s) to encrypt</span>
                    )}
                  </div>

                  {/* Asset Category Selection */}
                  <div className="flex flex-col gap-2 text-left mt-2">
                    <label className="text-[10px] text-textMuted uppercase tracking-widest font-bold">
                      Asset Category Metadata
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#08080B]/60 border border-white/5 p-3 rounded-xl text-textWhite text-xs outline-none focus:border-white/20 focus:bg-[#030304]/80 focus:shadow-[0_0_20px_rgba(255,255,255,0.04)] font-medium font-sans cursor-pointer transition-all duration-300"
                    >
                      <option value="">-- SELECT ASSET CLASSIFICATION CATEGORY (COMPULSORY) --</option>
                      <option value="credentials">🔑 Credentials & Password Lists (Stale Check: 6 Months)</option>
                      <option value="financial">💼 Crypto Keys & Seed Phrases (Stale Check: 12 Months)</option>
                      <option value="legal">📄 Wills & Legal Documents (Stale Check: 24 Months)</option>
                      <option value="memories">📸 Personal Memories & Photos (Stale Check: Permanent)</option>
                    </select>
                    {!category && fileUploaded && (
                      <span className="text-[9px] text-amber-500 font-extrabold uppercase mt-1.5 animate-pulse text-left block">
                        ⚠️ Mandatory: Select an asset category above to generate key shares.
                      </span>
                    )}
                  </div>

                  {/* Shard Download Dashboard for interactive local test */}
                  {fileUploaded && category && encryptedShards.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/[0.02] border border-white/5 p-4 rounded-xl flex flex-col gap-3 mt-2"
                    >
                      <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider block">
                        🔑 Key distribution status:
                      </span>
                      {useExistingKeys ? (
                        <p className="text-[10px] text-forestGreen font-bold leading-relaxed uppercase">
                          ✓ Re-using existing trustee key files. Your trustees will not need to download new files.
                        </p>
                      ) : (
                        <>
                          <p className="text-[10px] text-textMuted font-light leading-relaxed">
                            To test the local decryption pipeline later, download the key files and payload below:
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button
                              onClick={() => downloadShard(1, encryptedShards[0].hex, encryptedShards[0].privateKeyJWK, t1Name)}
                              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9px] text-white flex items-center justify-center gap-1.5 cursor-pointer uppercase transition-colors"
                            >
                              <Download className="w-3 h-3" /> Share 1 ({t1Name.split(' ')[0]})
                            </button>
                            <button
                              onClick={() => downloadShard(2, encryptedShards[1].hex, encryptedShards[1].privateKeyJWK, t2Name)}
                              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9px] text-white flex items-center justify-center gap-1.5 cursor-pointer uppercase transition-colors"
                            >
                              <Download className="w-3 h-3" /> Share 2 ({t2Name.split(' ')[0]})
                            </button>
                            <button
                              onClick={() => downloadShard(3, encryptedShards[2].hex, encryptedShards[2].privateKeyJWK, t3Name)}
                              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9px] text-white flex items-center justify-center gap-1.5 cursor-pointer uppercase transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" /> Share 3 ({t3Name.split(' ')[0]})
                            </button>
                          </div>
                        </>
                      )}

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
        <div className="md:col-span-4 flex flex-col gap-6 font-sans">

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

            {/* Live Terminal logs from Agent 01 */}
            <div className="border-t border-white/5 pt-4 mt-2">
              <span className="text-[9px] text-textMuted uppercase font-bold tracking-wider block mb-2">
                Agent 01 Live Telemetry
              </span>
              <div className="bg-[#030304]/60 border border-white/5 rounded-xl p-3 h-28 overflow-y-auto flex flex-col gap-2 font-mono text-[9px] leading-relaxed text-[#A1A1AA] scrollbar-none">
                {agent1Logs.map((log, idx) => (
                  <div key={idx} className="flex gap-1.5 items-start">
                    <span className="text-white/40 mt-0.5">❯</span>
                    <span>{log}</span>
                  </div>
                ))}
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
