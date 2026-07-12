import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Key, RefreshCw, FileText, ChevronRight, HelpCircle, Upload, Shield } from 'lucide-react';
import FilmGrain from '../components/FilmGrain';
import Logo from '../components/Logo';
import { reconstructSecret, decryptFile, hexToBytes, importKeyJWK, rsaDecrypt } from '../utils/crypto';
import { supabase } from '../utils/supabaseClient';

export default function TrusteeDecrypt() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const vaultId = searchParams.get('vault');
  
  // File upload input references
  const fileInputRefs = {
    1: useRef(null),
    2: useRef(null),
    3: useRef(null),
    payload: useRef(null)
  };

  // Real cryptographic shard data loaded from keys (after RSA decryption)
  const [shards, setShards] = useState({
    1: null, // { x: 1, data: Uint8Array }
    2: null,
    3: null
  });

  // Dynamic state from database
  const [vaultName, setVaultName] = useState('Encrypted Envelope');
  const [keyIv, setKeyIv] = useState('');
  const [encryptedBytes, setEncryptedBytes] = useState(null);
  const [encryptedFileName, setEncryptedFileName] = useState('');
  const [trusteesList, setTrusteesList] = useState([
    { id: 1, name: 'Aarav Patel', shard_index: 1 },
    { id: 2, name: 'Priya Sharma', shard_index: 2 },
    { id: 3, name: 'Rohan Iyer', shard_index: 3 }
  ]);

  const [loading, setLoading] = useState(false);
  const [fetchingVault, setFetchingVault] = useState(false);
  const [reconstructed, setReconstructed] = useState(false);
  const [decryptedFileUrl, setDecryptedFileUrl] = useState(null);
  const [decryptedFileName, setDecryptedFileName] = useState('');

  const getSubmissionsCount = () => {
    let count = 0;
    if (shards[1]) count++;
    if (shards[2]) count++;
    if (shards[3]) count++;
    return count;
  };

  // 1. Fetch Vault and download payload automatically if vaultId in URL
  useEffect(() => {
    if (!vaultId) return;

    const fetchVaultMetadata = async () => {
      setFetchingVault(true);
      try {
        // A. Query database vaults table
        const { data: vault, error: vaultError } = await supabase
          .from('vaults')
          .select('id, name, encrypted_file_path, iv')
          .eq('id', vaultId)
          .single();

        if (vaultError || !vault) throw new Error("Vault record not found in database.");

        setVaultName(vault.name);
        setDecryptedFileName(vault.name);
        setKeyIv(vault.iv);

        // B. Query database trustees table to fetch names
        const { data: trustees, error: trusteesError } = await supabase
          .from('trustees')
          .select('id, name, shard_index')
          .eq('vault_id', vaultId)
          .order('shard_index', { ascending: true });

        if (!trusteesError && trustees && trustees.length > 0) {
          setTrusteesList(trustees);
        }

        // C. Download encrypted payload file from Supabase Storage
        console.log("Downloading encrypted payload from cloud:", vault.encrypted_file_path);
        const { data: fileBlob, error: downloadError } = await supabase.storage
          .from('vaults')
          .download(vault.encrypted_file_path);

        if (downloadError) throw downloadError;

        const arrayBuffer = await fileBlob.arrayBuffer();
        setEncryptedBytes(new Uint8Array(arrayBuffer));
        setEncryptedFileName(vault.name + '.enc');
        console.log("Cloud payload downloaded and cached.");

      } catch (err) {
        console.error("Vault fetch failed:", err);
        alert(`Failed to load vault from cloud: ${err.message}`);
      } finally {
        setFetchingVault(false);
      }
    };

    fetchVaultMetadata();
  }, [vaultId]);

  // Handle uploading, RSA decrypting, and parsing a .key file
  const handleKeyUpload = (e, index) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (json.x && json.key && json.privateKey) {
          console.log(`Decrypting shard ${json.x} using private RSA key card...`);

          // A. Import Private RSA key
          const privateKey = await importKeyJWK(
            json.privateKey,
            { name: "RSA-OAEP", hash: "SHA-256" },
            ["decrypt"]
          );

          // B. Decrypt the wrapped shard payload
          const encryptedShardBytes = hexToBytes(json.key);
          const decryptedShardBytes = await rsaDecrypt(privateKey, encryptedShardBytes);

          // C. Load into active memory
          setShards((prev) => ({
            ...prev,
            [index]: { x: json.x, data: decryptedShardBytes, owner: json.owner || `Trustee ${index}` }
          }));
          
          if (json.iv && !keyIv) {
            setKeyIv(json.iv);
            console.log("Extracted IV from key file.");
          }
          console.log(`Loaded and unwrapped Key Shard ${json.x} successfully.`);

          // D. Log Access telemetry for Agent 05 Anti-Collusion checks
          try {
            let ipAddress = '127.0.0.1';
            try {
              const ipRes = await fetch('https://api.ipify.org?format=json');
              const ipData = await ipRes.json();
              ipAddress = ipData.ip;
            } catch (e) {
              // fallback if offline
            }

            const matched = trusteesList.find(t => t.shard_index === json.x);
            if (matched && vaultId) {
              await fetch('http://localhost:8000/api/trustee/log-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  vault_id: vaultId,
                  trustee_id: matched.id,
                  ip_address: ipAddress,
                  user_agent: navigator.userAgent
                })
              });
              console.log("[AG-05] Access signature logged successfully.");
            }
          } catch (logErr) {
            console.error("[AG-05] Access logging failed:", logErr);
          }
        } else {
          alert("Invalid key file format. Make sure it contains the encrypted key shard and its RSA private key card.");
        }
      } catch (err) {
        console.error("Key import/unwrap failed:", err);
        alert("Failed to decrypt key shard. Verify the file is not corrupted.");
      }
    };
    reader.readAsText(file);
  };

  // Handle uploading the encrypted payload (.enc file) manually
  const handlePayloadUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setEncryptedFileName(file.name);
    const baseName = file.name.endsWith('.enc') ? file.name.slice(0, -4) : `decrypted_${file.name}`;
    setDecryptedFileName(baseName);

    const reader = new FileReader();
    reader.onload = (event) => {
      const arrayBuffer = event.target.result;
      setEncryptedBytes(new Uint8Array(arrayBuffer));
      console.log("Encrypted payload loaded successfully.");
    };
    reader.readAsArrayBuffer(file);
  };

  const triggerKeyInput = (index) => {
    fileInputRefs[index].current.click();
  };

  const triggerPayloadInput = () => {
    fileInputRefs.payload.current.click();
  };

  const handleReconstruct = async () => {
    setLoading(true);
    
    let finalPayloadBytes = encryptedBytes;
    let finalIvHex = keyIv || sessionStorage.getItem('deaddrop_iv');

    // Fallback: If encryptedBytes is not loaded, check sessionStorage
    if (!finalPayloadBytes) {
      const hexPayload = sessionStorage.getItem('deaddrop_encrypted_payload');
      if (hexPayload) {
        finalPayloadBytes = hexToBytes(hexPayload);
        const savedName = sessionStorage.getItem('deaddrop_filename') || 'decrypted_secret.bin';
        setDecryptedFileName(savedName);
      }
    }

    if (!finalPayloadBytes || !finalIvHex) {
      setTimeout(() => {
        alert("Encrypted payload or IV not found! Please upload the encrypted file (.enc) AND at least one of the key shard files.");
        setLoading(false);
      }, 1000);
      return;
    }

    const iv = hexToBytes(finalIvHex);

    // Assemble active shards
    const activeShares = [];
    if (shards[1]) activeShares.push(shards[1]);
    if (shards[2]) activeShares.push(shards[2]);
    if (shards[3]) activeShares.push(shards[3]);

    setTimeout(async () => {
      try {
        // 1. Reconstruct Key
        const reconstructedKeyBytes = reconstructSecret(activeShares);

        // 2. Decrypt file bytes using AES-GCM
        const decryptedBytes = await decryptFile(finalPayloadBytes, reconstructedKeyBytes, iv);

        // 3. Generate file download url
        const blob = new Blob([decryptedBytes], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        
        setDecryptedFileUrl(url);
        setReconstructed(true);
      } catch (err) {
        console.error("Decryption error:", err);
        alert("Decryption failed! Shards do not match or key values are invalid.");
      } finally {
        setLoading(false);
      }
    }, 1500);
  };

  return (
    <div className="relative min-h-screen bg-[#030304] text-textWhite font-sans overflow-hidden flex flex-col justify-between">
      <FilmGrain />

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#030304]/75 backdrop-blur-md border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center shadow-lg">
        <Logo />
        <span className="text-xs text-textMuted font-semibold">Signatory Vault Access</span>
      </header>

      {/* MAIN CONTAINER */}
      <main className="relative z-10 flex-grow max-w-6xl mx-auto w-full px-6 pt-24 pb-16 grid md:grid-cols-12 gap-8 items-stretch">
        
        {/* LEFT COLUMN: LOCK STATUS & ENCRYPTED FILE UPLOADER */}
        <div className="md:col-span-5 flex flex-col justify-between bg-[#08080B]/80 border border-white/5 rounded-2xl p-6 glass-panel relative overflow-hidden">
          
          <div className="flex flex-col gap-5 text-left relative z-10">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 text-[10px] text-textMuted uppercase tracking-wider font-semibold">
              <span>Shamir Decryption Engine</span>
              <span>2 of 3 Required</span>
            </div>

            {/* Lock Visual */}
            <div className="flex flex-col items-center gap-4 my-2">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <motion.div 
                  animate={getSubmissionsCount() >= 2 ? { scale: 1.05 } : { scale: 1 }}
                  className={`absolute inset-0 border border-dashed rounded-full flex items-center justify-center transition-colors duration-300 ${getSubmissionsCount() >= 2 ? 'border-white/40 bg-white/[0.02]' : 'border-white/10'}`}
                >
                  {getSubmissionsCount() >= 2 ? (
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-1.5 border border-dashed border-white/20 rounded-full"
                    />
                  ) : null}
                </motion.div>
                {getSubmissionsCount() >= 2 ? (
                  <Unlock className="w-7 h-7 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]" />
                ) : (
                  <Lock className="w-7 h-7 text-textMuted" />
                )}
              </div>
              
              <div className="text-center font-sans">
                <span className={`text-[11px] font-bold uppercase tracking-wider block ${getSubmissionsCount() >= 2 ? 'text-forestGreen' : 'text-white'}`}>
                  {getSubmissionsCount() >= 2 ? 'Threshold Met: Vault Ready' : 'Threshold Pending: Vault Sealed'}
                </span>
                <span className="text-[9px] text-textMuted uppercase mt-1 block">
                  {getSubmissionsCount()} of 3 shards loaded
                </span>
              </div>
            </div>

            {/* Target Vault Details */}
            <div className="bg-[#030304]/40 border border-white/5 p-3.5 rounded-xl text-[10px] text-textMuted uppercase leading-relaxed">
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span>Target Envelope:</span>
                <span className="text-white font-semibold truncate max-w-[120px]">{vaultName}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span>Vault Status:</span>
                <span className={vaultId ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {fetchingVault ? 'Syncing...' : vaultId ? 'Database Connected' : 'Local Test Mode'}
                </span>
              </div>
            </div>

            {/* Encrypted payload uploader (Used as fallback/test) */}
            {!vaultId && (
              <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
                <span className="text-[9px] text-textMuted uppercase font-bold tracking-wider">
                  1. Upload Encrypted Archive File
                </span>
                
                <input type="file" ref={fileInputRefs.payload} onChange={handlePayloadUpload} className="hidden" />
                <div 
                  onClick={triggerPayloadInput}
                  className={`border border-dashed p-4 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${encryptedBytes ? 'border-forestGreen/40 bg-forestGreen/[0.02]' : 'border-white/10 hover:border-white/30 bg-white/[0.005] hover:bg-white/[0.015]'}`}
                >
                  <Upload className={`w-6 h-6 mb-2 ${encryptedBytes ? 'text-forestGreen' : 'text-textMuted'}`} />
                  <span className="text-[10px] text-textWhite font-semibold uppercase">
                    {encryptedBytes ? 'Payload Loaded' : 'Upload encrypted file (.enc)'}
                  </span>
                  {encryptedBytes && (
                    <span className="text-[9px] text-textMuted mt-1 truncate max-w-[180px]">
                      {encryptedFileName}
                    </span>
                  )}
                </div>
              </div>
            )}

          </div>

          <div className="border-t border-white/5 pt-4 mt-4 text-left">
            <Link 
              to="/trustee/guidance" 
              className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-white/10 rounded-full bg-white/[0.02] hover:bg-white/5 hover:border-white/20 text-xs text-textMuted hover:text-white transition-all font-semibold"
            >
              <HelpCircle className="w-4 h-4" /> Ask AI Guidance Agent for help →
            </Link>
          </div>

        </div>

        {/* RIGHT COLUMN: SHARD CONTROLLER */}
        <div className="md:col-span-7 flex flex-col justify-between bg-[#08080B]/80 border border-white/5 rounded-2xl p-6 glass-panel relative overflow-hidden">
          
          <div className="flex flex-col gap-6 text-left relative z-10">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 text-[10px] text-textMuted uppercase tracking-wider font-semibold">
              <span>Signatory checklist</span>
              <span>{vaultId ? '1. Upload key files' : '2. Upload key files'}</span>
            </div>

            <div className="flex flex-col gap-3 font-semibold text-[10px] uppercase">
              
              {/* Dynamic Trustee list loaded from database */}
              {trusteesList.map((t, idx) => {
                const sIndex = t.shard_index;
                return (
                  <div key={t.id || sIndex}>
                    <input type="file" ref={fileInputRefs[sIndex]} onChange={(e) => handleKeyUpload(e, sIndex)} className="hidden" />
                    <div 
                      onClick={() => triggerKeyInput(sIndex)}
                      className={`border p-4 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 ${shards[sIndex] ? 'border-white/40 bg-white/[0.02]' : 'border-white/5 hover:border-white/10 bg-white/[0.005]'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Key className={`w-4 h-4 ${shards[sIndex] ? 'text-white' : 'text-textMuted'}`} />
                        <span className="text-xs text-textWhite normal-case">
                          {shards[sIndex] ? `Shard 0${sIndex} Loaded (${shards[sIndex].owner})` : `${t.name} (Shard 0${sIndex})`}
                        </span>
                      </div>
                      <span className="text-[9px] text-textMuted flex items-center gap-1">
                        <Upload className="w-3 h-3" /> {shards[sIndex] ? 'Replace' : 'Upload .key'}
                      </span>
                    </div>
                  </div>
                );
              })}

            </div>
          </div>

          <div className="border-t border-white/5 pt-6 mt-6">
            <AnimatePresence mode="wait">
              {getSubmissionsCount() >= 2 ? (
                reconstructed ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col gap-3 font-sans"
                  >
                    <div className="bg-[#030304]/60 border border-white/15 p-3.5 rounded-xl text-[9px] text-white text-left uppercase leading-relaxed font-semibold">
                      ✓ Shamir Key reconstructed: Decryption Key generated in RAM. <br />
                      ✓ Encrypted payload decrypted locally in browser memory.
                    </div>
                    <a 
                      href={decryptedFileUrl} 
                      download={decryptedFileName}
                      className="w-full py-3.5 bg-white text-black hover:bg-zinc-200 text-xs font-bold tracking-wider rounded-full transition-all duration-200 uppercase flex items-center justify-center gap-2 cursor-pointer border-0 shadow-lg text-center"
                    >
                      <FileText className="w-4 h-4" /> Download Decrypted Archive
                    </a>
                  </motion.div>
                ) : (
                  <motion.button 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleReconstruct}
                    disabled={loading}
                    className="w-full py-3.5 bg-white text-black hover:bg-zinc-200 text-xs font-bold tracking-wider rounded-full transition-all duration-200 uppercase flex items-center justify-center gap-2 cursor-pointer border-0 shadow-lg"
                  >
                    {loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Reconstruct Archive Key</span>
                      </>
                    )}
                  </motion.button>
                )
              ) : (
                <div className="w-full py-3.5 border border-dashed border-white/10 rounded-xl text-[10px] text-textMuted uppercase text-center font-semibold">
                  Waiting for at least 2 key shard files to upload
                </div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full py-5 px-6 border-t border-white/5 bg-[#050506]/40 font-mono text-[9px] text-[#52525B]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <span>DEADDROP DECRYPTION ENGINE</span>
          <span>© 2026 SERVICES.</span>
        </div>
      </footer>

    </div>
  );
}
