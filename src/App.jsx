import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Setup from './pages/Setup';
import Checkin from './pages/Checkin';
import Agents from './pages/Agents';
import TrusteeDecrypt from './pages/TrusteeDecrypt';
import TrusteeGuidance from './pages/TrusteeGuidance';
import PageTransition from './components/PageTransition';
import { supabase } from './utils/supabaseClient';

// Route protection component
const ProtectedRoute = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session status
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for authentication changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030304] text-textWhite flex flex-col justify-center items-center gap-3 font-sans">
        <div className="w-6 h-6 border-2 border-t-white border-white/10 rounded-full animate-spin" />
        <span className="text-[10px] text-textMuted uppercase font-bold tracking-wider">// Syncing secure session...</span>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Temporary placeholder for alerts
const PlaceholderPage = ({ title }) => (
  <PageTransition>
    <div className="min-h-screen bg-[#030304] text-textWhite flex flex-col justify-center items-center gap-4 p-6 font-sans">
      <h2 className="font-sans font-bold text-2xl uppercase tracking-wider text-white">{title}</h2>
      <p className="text-xs text-textMuted uppercase">// Core visual interface loading...</p>
      <Link to="/" className="text-xs text-textMuted hover:text-white underline mt-4">Return to Landing</Link>
    </div>
  </PageTransition>
);

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
        <Route path="/login" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/signup" element={<PageTransition><Auth /></PageTransition>} />
        
        {/* User Cockpit Routes (Protected) */}
        <Route path="/dashboard" element={<ProtectedRoute><PageTransition><Dashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/setup" element={<ProtectedRoute><PageTransition><Setup /></PageTransition></ProtectedRoute>} />
        <Route path="/checkin" element={<ProtectedRoute><PageTransition><Checkin /></PageTransition></ProtectedRoute>} />
        <Route path="/agents" element={<ProtectedRoute><PageTransition><Agents /></PageTransition></ProtectedRoute>} />
        
        {/* Trustee Custody Routes (Public) */}
        <Route path="/trustee/:id" element={<Navigate to="/trustee/decrypt" replace />} />
        <Route path="/trustee/decrypt" element={<PageTransition><TrusteeDecrypt /></PageTransition>} />
        <Route path="/trustee/guidance" element={<PageTransition><TrusteeGuidance /></PageTransition>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
