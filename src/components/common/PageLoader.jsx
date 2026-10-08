import { Radio } from 'lucide-react';
import { IcmuSmallLogo } from './IcmuEmblem';

export function PageLoader() {
  return (
    <div className="min-h-screen bg-[#060907] text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute w-72 h-72 rounded-full bg-emerald-950/40 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center space-y-4">
        <div className="relative flex items-center justify-center">
          <IcmuSmallLogo className="w-12 h-12 animate-pulse" />
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-emerald-400 uppercase tracking-widest">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>CONNECTING AIRWAVES RELAY</span>
          </div>
          <p className="text-xs text-white/50 font-mono">
            FETCHING MODULE VIA SUSPENSE...
          </p>
        </div>
      </div>
    </div>
  );
}

export default PageLoader;
