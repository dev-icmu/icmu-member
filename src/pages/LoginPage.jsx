import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, UsersRound } from 'lucide-react';
import { IcmuSmallLogo } from '../components/common/IcmuEmblem';
import { useAuth } from '../context/AuthContext';
import { Input } from '@/components/motion/input';
import { Button } from '@/components/motion/button/base';

export default function LoginPage() {
  const { login, isAdmin, accessLoading, authError } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (isAdmin && !accessLoading) return <Navigate to="/admin" replace />;

  async function handleLogin(event) {
    event.preventDefault();
    if (submitting || accessLoading) return;
    setError(null);
    setSubmitting(true);
    try { await login(identifier, password); }
    catch (failure) { setError(failure.message); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="min-h-svh bg-[#070d09] text-[#e9f0eb] selection:bg-emerald-500/30">
      <div className="mx-auto grid min-h-svh max-w-[1600px] lg:grid-cols-[.95fr_1fr]">
        <aside className="relative m-3 hidden overflow-hidden rounded-3xl border border-white/[.06] bg-[#0b1a10] p-10 lg:flex lg:flex-col xl:p-14">
          <Link to="/" className="relative z-10 flex w-fit items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-emerald-300">
            <IcmuSmallLogo className="h-10 w-10" />
            <span><span className="block text-xl font-semibold tracking-tight">MEMBER</span><span className="block text-[10px] tracking-[.16em] text-[#93ad9a]">ISIPATHANA COLLEGE MEDIA UNIT</span></span>
          </Link>
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-16 h-[440px] w-[440px] rounded-full bg-emerald-600/15 blur-[100px]" />
          <div className="relative my-auto py-20">
            <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200/15 bg-emerald-400/[.07] text-emerald-300"><UsersRound className="h-6 w-6" /></div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[.18em] text-emerald-300">The admin workspace</p>
            <h1 className="max-w-md text-4xl font-semibold leading-[1.2] tracking-tight xl:text-5xl">A clear view of<br />your media unit.</h1>
            <p className="mt-6 max-w-sm text-sm leading-7 text-[#a6baad]">Review applications, manage members, and help every team stay organised.</p>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs text-[#c4d3c8]">
              {['Members', 'Applications', 'Teams & skills'].map(label => <span key={label} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{label}</span>)}
            </div>
          </div>
          <p className="relative text-xs leading-6 text-[#809889]">Isipathana College Media Unit<br />Member administration</p>
        </aside>

        <main className="flex min-w-0 flex-col px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))] sm:px-12 lg:px-16">
          <Link to="/" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg text-sm text-[#a5b6ab] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300"><ArrowLeft className="h-4 w-4" />Back to website</Link>
          <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
            <div className="mb-8 flex items-center gap-3 lg:hidden"><IcmuSmallLogo className="h-9 w-9" /><span className="text-lg font-semibold tracking-tight">MEMBER</span></div>
            <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[.035] text-emerald-300"><KeyRound className="h-5 w-5" /></span>
            <h2 className="text-[28px] font-semibold tracking-tight">Welcome back.</h2>
            <p className="mb-8 mt-3 text-sm leading-6 text-[#a5b6ab]">Sign in with your ICMU website admin account.</p>

            <form onSubmit={handleLogin} className="space-y-5" aria-busy={submitting}>
              <Input id="admin-identifier" name="index_number" label="School index number"
                type="text" inputMode="numeric" autoComplete="username" autoCapitalize="none" spellCheck={false}
                required maxLength={100} value={identifier} onChange={setIdentifier}
                placeholder="Your index number" disabled={submitting}
                classNames={{ field: 'h-12 rounded-xl border-white/10 bg-white/[.025]', label: 'text-[13px] text-[#c8d5cc]', input: 'text-base' }} />
              <Input id="admin-password" name="password" label="Password" type={showPassword ? 'text' : 'password'}
                autoComplete="current-password" required value={password} onChange={setPassword} placeholder="Enter your password" disabled={submitting}
                rightIcon={<button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="rounded-lg focus-visible:outline-2 focus-visible:outline-emerald-300">{showPassword ? <EyeOff /> : <Eye />}</button>}
                classNames={{ field: 'h-12 rounded-xl border-white/10 bg-white/[.025]', label: 'text-[13px] text-[#c8d5cc]', input: 'text-base' }} />
              {(error || authError) && <p role="alert" className="rounded-xl border border-red-300/15 bg-red-400/[.06] px-4 py-3 text-sm leading-6 text-red-200">{error || authError}</p>}
              <Button type="submit" size="lg" disabled={submitting || accessLoading} className="mt-2 w-full rounded-xl bg-[#78e5a0] font-semibold text-[#092313] hover:bg-[#91ecb2] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300" pressScale={0.98}>
                {submitting || accessLoading ? <><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />{submitting ? 'Signing in...' : 'Checking your session...'}</> : <>Sign in<ArrowUpRight className="h-4 w-4" /></>}
              </Button>
            </form>
            <p className="mt-6 text-xs leading-6 text-[#8ca294]">Need access or a password reset? Contact your ICMU super admin.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#81998a]"><ShieldCheck className="h-4 w-4" />For authorised ICMU administrators</div>
        </main>
      </div>
    </div>
  );
}
