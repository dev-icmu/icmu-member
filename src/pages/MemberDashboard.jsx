import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';
import { IcmuSmallLogo } from '../components/common/IcmuEmblem';
import { Button } from '@/components/motion/button/base';

export default function MemberDashboard() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#030704] text-white font-sans">
      <header className="sticky top-0 z-50 bg-[#050a07] border-b border-gray-800/80 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IcmuSmallLogo className="w-8 h-8" />
            <span className="font-semibold text-sm tracking-wide text-gray-200">Member Portal</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-[#050a07] border border-gray-800/80 rounded-xl p-8 max-w-2xl mx-auto shadow-2xl text-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent mb-4">
                Welcome, {user?.email}
            </h1>
            <p className="text-gray-400 mb-8">
                Your application has been received. This dashboard will allow you to view your official Member ID and select your production team once your application is approved by the admin.
            </p>

            <div className="p-6 bg-[#030704] border border-gray-800 rounded-lg inline-block text-left w-full max-w-md">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</h3>
                <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="font-medium text-emerald-400">Account Active</span>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}
