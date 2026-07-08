import React from 'react';

export default function Logo() {
  return (
    <div className="flex items-center gap-2.5 select-none group cursor-pointer font-sans">
      <div className="w-2 h-2 rounded-full bg-white group-hover:bg-zinc-200 transition-colors shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
      <span className="font-extrabold text-sm tracking-[0.25em] text-white uppercase transition-colors duration-300">
        DeadDrop
      </span>
    </div>
  );
}
