import React from 'react';

/**
 * ICMU Emblem component - Replicates the white vector line-art emblem
 * seen in the center of the hero section of the screenshot.
 */
export function IcmuEmblem({ className = "w-64 h-64", glow = true }) {
  return (
    <div className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}>
      {glow && (
        <div 
          className="absolute inset-0 rounded-full bg-emerald-500/10 blur-3xl scale-125 animate-pulse pointer-events-none"
          style={{ animationDuration: '4s' }}
        />
      )}
      <img
        src="/apple-touch-icon.png"
        alt="Isipathana College Media Unit Emblem"
        className="relative z-10 w-full h-full object-contain filter brightness-0 invert drop-shadow-[0_0_20px_rgba(255,255,255,0.35)] transition-transform duration-500 hover:scale-105"
        style={{
          imageRendering: '-webkit-optimize-contrast',
        }}
      />
    </div>
  );
}

export function IcmuSmallLogo({ className = "w-10 h-10" }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <img
        src="/apple-touch-icon.png"
        alt="ICMU Logo"
        className="w-full h-full object-contain filter brightness-0 invert drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
      />
    </div>
  );
}
