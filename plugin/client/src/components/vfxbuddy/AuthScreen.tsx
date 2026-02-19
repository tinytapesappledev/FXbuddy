import React, { useState } from 'react';
import { login, register, AuthResponse } from '../../services/api';
import { Loader2 } from 'lucide-react';

interface Props {
  onAuth: (user: AuthResponse['user']) => void;
}

export const AuthScreen: React.FC<Props> = ({ onAuth }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = mode === 'login'
        ? await login(email, password)
        : await register(email, password);
      onAuth(result.user);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full bg-base flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-xs flex flex-col items-center gap-6">
        {/* Mascot */}
        <svg width="64" height="40" viewBox="0 0 64 40">
          <rect x="2" y="2" width="60" height="36" rx="12" fill="var(--mascot-body)" />
          <ellipse cx="22" cy="20" rx="7" ry="9" fill="var(--mascot-face)" />
          <ellipse cx="42" cy="20" rx="7" ry="9" fill="var(--mascot-face)" />
        </svg>

        <div className="text-center">
          <h1 className="text-xl font-bold text-neu-text font-syne">FXbuddy</h1>
          <p className="text-xs text-neu-text-light mt-1">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-base text-neu-text text-sm shadow-neu-pressed focus:outline-none focus:ring-1 focus:ring-neu-accent/20 placeholder-neu-text-light"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-4 py-3 rounded-xl bg-base text-neu-text text-sm shadow-neu-pressed focus:outline-none focus:ring-1 focus:ring-neu-accent/20 placeholder-neu-text-light"
          />

          {error && (
            <p className="text-xs text-status-error text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-base text-neu-accent font-bold shadow-neu-button hover:shadow-neu-button-active active:scale-[0.98] transition-all text-sm uppercase tracking-wide disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          className="text-xs text-neu-text-light hover:text-neu-accent transition-colors"
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
};
