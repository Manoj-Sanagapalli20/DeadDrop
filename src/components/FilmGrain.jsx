import React from 'react';

export default function FilmGrain() {
  return (
    <>
      {/* Animated Film Grain Overlay */}
      <div className="grain-overlay" />
      
      {/* Technical blueprint grids */}
      <div className="fixed inset-0 grid-overlay opacity-[0.9] pointer-events-none z-0" />
      
      {/* Deep, highly-attractive modern violet/indigo glows (Stripe-like) */}
      <div className="fixed -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-[#6366F1]/[0.05] filter blur-[150px] pointer-events-none z-0 animate-pulse-slow" />
      <div className="fixed -bottom-[35%] -right-[15%] w-[65%] h-[65%] rounded-full bg-[#8B5CF6]/[0.045] filter blur-[135px] pointer-events-none z-0" />
      <div className="fixed top-[20%] right-[20%] w-[50%] h-[50%] rounded-full bg-[#F3F4F6]/[0.015] filter blur-[140px] pointer-events-none z-0" />
      
      {/* Subtle top silver illumination */}
      <div className="fixed top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#F3F4F6]/20 to-transparent pointer-events-none z-50" />
    </>
  );
}
