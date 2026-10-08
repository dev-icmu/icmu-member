import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { IcmuSmallLogo, IcmuEmblem } from '../components/common/IcmuEmblem';

export default function ErrorPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#080d0a] text-gray-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#080d0a]/90 backdrop-blur-md border-b border-gray-800 px-4 h-14">
        <div className="max-w-5xl mx-auto h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <IcmuSmallLogo className="w-6 h-6" />
            <span className="font-semibold text-sm text-white">
              Isipathana Media Unit
            </span>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-700 hover:border-gray-500 text-xs text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main 404 Content */}
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md text-center bg-[#0c130f] border border-gray-800 rounded-2xl p-8 sm:p-10 shadow-xl">
          <div className="flex justify-center mb-4">
            <IcmuEmblem className="w-16 h-16" glow={false} />
          </div>

          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest block mb-2">
            Error 404
          </span>

          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
            Page Not Found
          </h1>

          <p className="text-xs text-gray-400 leading-relaxed mb-6">
            The page you are looking for does not exist or has been moved.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Go to Home</span>
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-md border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Log In
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-500 border-t border-gray-800/60">
        © {new Date().getFullYear()} Isipathana College Media Unit. All rights reserved.
      </footer>
    </div>
  );
}
