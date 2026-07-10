import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Key, ArrowRight, Chrome, Lock, Unlock, RefreshCw, Eye, EyeOff } from 'lucide-react';
import FilmGrain from '../components/FilmGrain';
import Logo from '../components/Logo';
import { supabase } from '../utils/supabaseClient';

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [terminalMsg, setTerminalMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setTerminalMsg(isLogin ? 'Contacting secure database gateway...' : 'Registering new vault keyholder...');
    
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        setTerminalMsg('Authorization signature verified. Access granted.');
        setTimeout(() => {
          setLoading(false);
          navigate('/dashboard');
        }, 1200);

      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password
        });

        if (error) throw error;

        if (data?.user) {
          // Write user's full name to the profiles table
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              full_name: fullName,
              email: email
            });
          if (profileError) console.error("Failed to write user profile:", profileError);
        }

        if (data?.user && !data?.session) {
          setTerminalMsg('Registration complete! Please check your email inbox to confirm your account.');
          setLoading(false);
        } else {
          setTerminalMsg('Account created! Initializing vault envelope setup...');
          setTimeout(() => {
            setLoading(false);
            navigate('/setup');
          }, 1200);
        }
      }
    } catch (err) {
      // Provide beautiful, friendly, detailed error guidance instead of raw network breaks
      let userFriendlyMsg = err.message;
      if (err.message.includes('Failed to fetch')) {
        userFriendlyMsg = "Connection Timeout: Unable to contact Supabase. Check your internet connection or server settings.";
      } else if (err.message.includes('Email not confirmed')) {
        userFriendlyMsg = "Access Denied: Your email address has not been confirmed. Please click the activation link in your inbox first.";
      } else if (err.message.includes('Invalid login credentials')) {
        userFriendlyMsg = "Access Denied: Invalid email or passkey signature. Please verify and try again.";
      }

      setTerminalMsg(`Error: ${userFriendlyMsg}`);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setTerminalMsg('Redirecting to Google secure authentication...');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/dashboard'
        }
      });
      if (error) throw error;
    } catch (err) {
      setTerminalMsg(`OAuth Connection Failed: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#030304] text-textWhite font-sans overflow-hidden flex flex-col justify-between">
      <FilmGrain />

      {/* PREMIUM BACKGROUND NEON GLOWS FOR DEPTH */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-radial-gradient from-white/[0.025] to-transparent pointer-events-none blur-3xl z-0" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-radial-gradient from-white/[0.01] to-transparent pointer-events-none blur-2xl z-0" />

      {/* Header bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <Logo />
        <Link 
          to="/" 
          className="px-4 py-1.5 border border-white/10 rounded-full bg-white/[0.02] hover:bg-white/5 hover:border-white/20 text-textMuted hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider shadow-lg"
        >
          Return to home
        </Link>
      </header>

      {/* Main card */}
      <main className="relative z-10 flex-grow flex items-center justify-center px-6 py-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-md bg-[#08080B]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 relative shadow-[0_0_50px_rgba(255,255,255,0.015)] overflow-hidden glass-panel glint-effect"
        >
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Top Lock status visual */}
          <div className="flex flex-col items-center gap-2 mb-2 relative z-10">
            <div className="w-14 h-14 border border-white/10 rounded-full flex items-center justify-center bg-white/[0.02] relative group shadow-inner">
              <div className="absolute inset-1.5 border border-dashed border-white/25 rounded-full animate-spin-slow group-hover:border-white/40 transition-colors" />
              <div className="absolute inset-0 rounded-full bg-white/[0.01] blur-md animate-pulse" />
              
              <AnimatePresence mode="wait">
                {isLogin ? (
                  <motion.div
                    key="lock"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Lock className="w-4 h-4 text-white" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="unlock"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Unlock className="w-4 h-4 text-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <span className="text-[9px] text-textMuted uppercase tracking-widest font-extrabold mt-1">
              {isLogin ? 'Access secure vault' : 'Create secure vault'}
            </span>
          </div>

          {/* Selector Tabs (Sliding glass indicator) */}
          <div className="relative grid grid-cols-2 bg-white/[0.02] border border-white/5 rounded-full p-1 relative z-10 text-[10px] uppercase font-bold tracking-wider">
            <motion.div
              layoutId="auth-tab-backdrop"
              className="absolute top-1 bottom-1 rounded-full bg-white/5 border border-white/10"
              style={{
                left: isLogin ? '4px' : 'calc(50% + 2px)',
                width: 'calc(50% - 6px)',
              }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            />
            
            <button 
              type="button"
              onClick={() => { setIsLogin(true); setTerminalMsg(''); }}
              className={`py-2 z-10 transition-colors duration-200 cursor-pointer ${isLogin ? 'text-white font-extrabold' : 'text-textMuted hover:text-white font-medium'}`}
            >
              Sign In
            </button>
            
            <button 
              type="button"
              onClick={() => { setIsLogin(false); setTerminalMsg(''); }}
              className={`py-2 z-10 transition-colors duration-200 cursor-pointer ${!isLogin ? 'text-white font-extrabold' : 'text-textMuted hover:text-white font-medium'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 relative z-10">
            
            {/* Full Name Field (Only on Sign Up) */}
            {!isLogin && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex flex-col gap-1.5 text-left overflow-hidden"
              >
                <label className="text-[9px] text-textMuted uppercase tracking-widest font-bold">
                  Full Name
                </label>
                <input 
                  type="text"
                  required={!isLogin}
                  placeholder="Vijay Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#030304]/60 border border-white/5 focus:border-white/20 focus:bg-[#030304]/80 focus:shadow-[0_0_20px_rgba(255,255,255,0.04)] focus:ring-0 rounded-xl p-3.5 text-xs placeholder:text-zinc-700 outline-none text-textWhite transition-all duration-300 font-medium font-sans"
                />
              </motion.div>
            )}

            {/* Email Field */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[9px] text-textMuted uppercase tracking-widest font-bold">
                Email Address
              </label>
              <input 
                type="email"
                required
                placeholder="vj.sharma@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#030304]/60 border border-white/5 focus:border-white/20 focus:bg-[#030304]/80 focus:shadow-[0_0_20px_rgba(255,255,255,0.04)] focus:ring-0 rounded-xl p-3.5 text-xs placeholder:text-zinc-700 outline-none text-textWhite transition-all duration-300 font-medium font-sans"
              />
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5 text-left">
              <div className="flex justify-between items-center">
                <label className="text-[9px] text-textMuted uppercase tracking-widest font-bold">
                  Vault Passkey
                </label>
                {isLogin && (
                  <button 
                    type="button"
                    onClick={() => alert("Check your email for passkey reset link.")}
                    className="text-[9px] text-textMuted hover:text-white cursor-pointer transition-colors font-bold uppercase tracking-wider"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#030304]/60 border border-white/5 focus:border-white/30 focus:bg-[#030304]/80 focus:shadow-[0_0_20px_rgba(255,255,255,0.06)] focus:ring-0 rounded-xl p-3.5 pr-12 text-xs placeholder:text-zinc-700 outline-none text-textWhite transition-all duration-300 font-medium font-sans"
                />
                <motion.button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  whileHover={{ scale: 1.08, color: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
                  whileTap={{ scale: 0.92 }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-textMuted transition-all duration-150 cursor-pointer bg-transparent border-0 p-2 flex items-center justify-center rounded-lg"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </motion.button>
              </div>
            </div>

            {/* Interactive Terminal Messaging */}
            {terminalMsg && (
              <div className="bg-[#050508]/85 border border-white/5 rounded-xl p-3 text-left font-mono text-[9px] leading-relaxed text-[#A1A1AA] flex gap-2 relative shadow-inner overflow-hidden uppercase tracking-wider">
                <span className="text-white select-none">❯</span>
                <span className={terminalMsg.includes('Error:') ? 'text-red-400 font-bold' : terminalMsg.includes('granted') || terminalMsg.includes('complete') ? 'text-forestGreen font-bold' : 'text-white'}>
                  {terminalMsg}
                </span>
              </div>
            )}

            {/* Submit Action */}
            <div className="flex flex-col gap-3 mt-2">
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-white text-black hover:bg-zinc-200 hover:shadow-[0_0_25px_rgba(255,255,255,0.15)] font-bold text-xs tracking-widest rounded-xl transition-all duration-300 uppercase flex items-center justify-center gap-2 cursor-pointer border-0"
              >
                {loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>{isLogin ? 'Enter Vault Cockpit' : 'Secure Vault Keypair'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-3 text-[8px] text-textMuted uppercase font-bold tracking-widest">or authentication provider</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              <button 
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-3 bg-[#08080B]/50 hover:bg-white/[0.04] border border-white/5 hover:border-white/10 text-textMuted hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Chrome className="w-3.5 h-3.5" /> Google Account
              </button>
            </div>

          </form>

        </motion.div>
        
      </main>

      {/* Footer copyright */}
      <footer className="relative z-10 w-full py-5 px-6 border-t border-white/5 bg-[#050506]/40 font-mono text-[9px] text-[#52525B]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <span>DEADDROP CREDENTIAL SECURITY GATEWAY</span>
          <span>© 2026 SERVICES.</span>
        </div>
      </footer>

    </div>
  );
}
