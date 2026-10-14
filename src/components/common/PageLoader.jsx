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
        </div>

      </div>
    </div>
  );
}

export default PageLoader;
