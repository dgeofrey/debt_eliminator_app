import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Loader2, Sun, Moon } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { TextInput } from './ui';

export default function Login() {
  const { login }           = useAuth();
  const { theme, toggle }   = useTheme();
  const navigate             = useNavigate();
  const [email, setEmail]    = useState('');
  const [password, setPass]  = useState('');
  const [error, setError]    = useState('');
  const [loading, setLoading]= useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try { await login(email, password); navigate('/'); }
    catch (err: any) { setError(err.message || 'Sign in failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-ink-950 text-ink-900 dark:text-white flex flex-col transition-colors">

      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs tracking-widest">DE</span>
          </div>
          <span className="font-bold text-sm tracking-widest uppercase text-ink-900 dark:text-white">Eliminator</span>
        </div>
        <button onClick={toggle}
          className="p-2 rounded-lg text-ink-400 dark:text-white/40 hover:text-ink-700 dark:hover:text-white transition-colors">
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          <div className="mb-10">
            <h1 className="text-4xl font-bold tracking-tight text-ink-900 dark:text-white leading-tight">
              Sign in.
            </h1>
            <p className="text-sm text-ink-500 dark:text-white/40 mt-2 font-light">
              Continue your payoff plan.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 text-xs bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg p-3 text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="eyebrow mb-1.5 block">Email</label>
              <TextInput type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoComplete="email" placeholder="you@example.com"
                leftIcon={<Mail className="w-3.5 h-3.5" />} />
            </div>

            <div>
              <label className="eyebrow mb-1.5 block">Password</label>
              <TextInput type="password" value={password} onChange={e => setPass(e.target.value)}
                required autoComplete="current-password" placeholder="••••••••"
                leftIcon={<Lock className="w-3.5 h-3.5" />} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full mt-2 py-3 rounded-lg bg-ink-900 hover:bg-ink-800 dark:bg-white dark:hover:bg-ink-100 text-white dark:text-ink-900 text-sm font-bold tracking-wide transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</> : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-ink-100 dark:border-white/[0.06] text-center">
            <p className="text-sm text-ink-500 dark:text-white/40 font-light mb-3">Don't have an account?</p>
            <Link to="/register"
              className="inline-block w-full py-3 rounded-lg border border-ink-200 dark:border-white/15 text-ink-700 dark:text-white text-sm font-semibold tracking-wide hover:bg-ink-50 dark:hover:bg-white/5 transition-all text-center">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
