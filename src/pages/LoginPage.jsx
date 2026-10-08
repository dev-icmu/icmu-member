import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { IcmuSmallLogo, IcmuEmblem } from '../components/common/IcmuEmblem';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Input } from '@/components/motion/input';
import { cn } from '@/lib/utils';
import { Button } from '@/components/motion/button/base';

export default function LoginPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      addToast({
        message: 'Logged in successfully',
        type: 'success',
      });
      navigate('/admin');
    } catch (error) {
      let errorMessage = error.message || 'Login failed';
      if (errorMessage.includes('Email not confirmed') || error.status === 400) {
        errorMessage = 'Invalid credentials or unconfirmed email. If you just created this admin, please confirm the email address in Supabase first.';
      }
      
      addToast({
        message: errorMessage,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080d0a] text-gray-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-200">
      <header className="sticky top-0 z-40 bg-[#080d0a]/90 backdrop-blur-md border-b border-gray-800 px-4 h-14">
        <div className="max-w-5xl mx-auto h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <IcmuSmallLogo className="w-6 h-6" />
            <span className="font-semibold text-sm text-white">Isipathana Media Unit</span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-700 hover:border-gray-500 text-xs text-gray-300 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className={cn("w-full max-w-md p-6 sm:p-8 relative overflow-hidden", "rounded-2xl md:rounded-3xl bg-card text-card-foreground border border-border/50", "shadow-xl shadow-muted/10 backdrop-blur-md", "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-muted/20")}>
          <div className="text-center mb-8 relative z-10">
            <div className="flex justify-center mb-4">
              <IcmuEmblem className="w-12 h-12" glow={true} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin Login</h1>
            <p className="text-xs text-gray-400 mt-2">Sign in to access the ICMU Administration Panel.</p>
            <p className="text-[10px] text-emerald-400/80 mt-1">(Use the email and password you created in your Supabase Auth dashboard)</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 relative z-10">
            <Input
              label="Admin Email"
              type="email"
              required
              value={email}
              onChange={(val) => setEmail(val)}
              placeholder="admin@icmu.lk"
            />
            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(val) => setPassword(val)}
              placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
            />
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              size="md"
              className="w-full mt-2"
            >
              {loading ? 'Authenticating...' : 'Secure Login'}
            </Button>
          </form>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-gray-600 border-t border-gray-800/60">
        &copy; {new Date().getFullYear()} Isipathana College Media Unit. Authorized personnel only.
      </footer>
    </div>
  );
}

