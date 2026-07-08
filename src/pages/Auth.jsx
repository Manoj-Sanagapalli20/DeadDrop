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
          setTerminalMsg('Registration complete! Please check your email for confirmation link.');
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
      setTerminalMsg(`Access Denied: ${err.message}`);
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

      {/* BACKGROUND GLOWS FOR DEPTH & ATTRACTION */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-radial-gradient from-white/[0.03] to-transparent pointer-events-none blur-3xl z-0" />
      <div className="absolute bottom-10 right-10 w-[250px] h-[250px] bg-radial-gradient from-white/[0.01] to-transparent pointer-events-none blur-2xl z-0" />

      {/* Header bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <Logo />
        <Link 
          to="/" 
          className="px-4 py-1.5 border border-white/10 rounded-full bg-white/[0.02] hover:bg-white/5 hover:border-white/20 text-textMuted hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider"
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
          className="w-full max-w-md bg-[#08080B]/75 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 relative shadow-2xl overflow-hidden glass-panel"
        >
          {/* Card subtle glint highlight top border */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          {/* Top Lock status visual */}
          <div className="flex flex-col items-center gap-2 mb-2 relative z-10">
            <div className="w-14 h-14 border border-white/10 rounded-full flex items-center justify-center bg-white/[0.02] relative group">
              {/* Spinning particle dash circle */}
              <div className="absolute inset-1.5 border border-dashed border-white/20 rounded-full animate-spin-slow group-hover:border-white/40 transition-colors" />
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
            
            <span className="text-[9px] text-textMuted uppercase tracking-widest font-bold mt-1.5">
              {isLogin ? 'Access secure vault' : 'Create secure vault'}
            </span>
          </div>

          {/* Selector Tabs (Sliding glass indicator) */}
          <div className="relative grid grid-cols-2 bg-white/[0.02] border border-white/5 rounded-full p-1 relative z-10 text-[10px] uppercase font-bold tracking-wider">
            {/* Sliding backdrop */}
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
              className={`py-2 z-10 transition-colors duration-200 cursor-pointer ${isLogin ? 'text-white' : 'text-textMuted hover:text-white'}`}
            >
              Sign In
            </button>
            
            <button 
              type="button"
              onClick={() => { setIsLogin(false); setTerminalMsg(''); }}
              className={`py-2 z-10 transition-colors duration-200 cursor-pointer ${!isLogin ? 'text-white' : 'text-textMuted hover:text-white'}`}
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
                  className="w-full bg-[#030304]/60 border border-white/5 focus:border-white/20 focus:bg-[#030304]/80 focus:shadow-[0_0_15px_rgba(255,255,255,0.03)] focus:ring-0 rounded-xl p-3.5 text-xs placeholder:text-zinc-700 outline-none text-textWhite transition-all duration-300 font-medium font-sans"
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
                placeholder="name@domain.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#030304]/60 border border-white/5 focus:border-white/20 focus:bg-[#030304]/80 focus:shadow-[0_0_15px_rgba(255,255,255,0.03)] focus:ring-0 rounded-xl p-3.5 text-xs placeholder:text-zinc-700 outline-none text-textWhite transition-all duration-300 font-medium"
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
                    className="text-[9px] text-textMuted hover:text-white cursor-pointer transition-colors font-semibold"
                  >
                    Forgot passkey?
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
            <AnimatePresence mode="wait">
              {terminalMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] text-textMuted bg-black/40 border border-white/5 p-3.5 rounded-xl text-left font-sans flex items-start gap-2"
                >
                  <span className="text-white/40 mt-0.5 select-none">❯</span>
                  <span className={terminalMsg.includes('Access Denied') || terminalMsg.includes('Failed') ? 'text-red-400 font-medium' : terminalMsg.includes('granted') || terminalMsg.includes('complete') || terminalMsg.includes('created') ? 'text-forestGreen font-medium' : 'text-white'}>
                    {terminalMsg}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action button: stark white and black text for 100% visibility */}
            <motion.button 
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-4 mt-2 bg-white text-black hover:bg-zinc-200 border-0 font-bold text-xs tracking-widest transition-all duration-200 uppercase rounded-full flex justify-center items-center gap-2 cursor-pointer shadow-xl shadow-white/5"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Access Vault' : 'Create Vault'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </motion.button>

          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-1 z-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5" />
            </div>
            <span className="relative px-4 bg-[#08080B] text-[8px] text-textMuted uppercase tracking-widest font-bold">
              Or continue with
            </span>
          </div>

          {/* Google Auth button */}
          <motion.button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.15)' }}
            className="w-full py-3 bg-white/[0.01] border border-white/5 text-textWhite text-[9px] font-extrabold tracking-widest transition-all duration-200 uppercase rounded-full flex items-center justify-center gap-2.5 relative z-10 cursor-pointer"
          >
            <Chrome className="w-3.5 h-3.5 text-white" />
            <span>Google Account</span>
          </motion.button>

        </motion.div>
      </main>

      {/* Footer copyright */}
      <footer className="relative z-10 w-full py-6 px-6 border-t border-white/5 bg-[#050506]/40 text-[9px] text-[#52525B]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <span>DEADDROP SECURITY PLATFORM</span>
          <span>© 2026 SERVICES.</span>
        </div>
      </footer>

    </div>
  );
}
