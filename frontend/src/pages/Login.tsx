import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Loader2 } from 'lucide-react';
import { login, auth } from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const ok = await login(key.trim());
    setBusy(false);
    if (ok) {
      navigate('/dashboard', { replace: true });
    } else {
      setError('Invalid key');
      auth.clear();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl italic text-ink-50">
            Restaff<span className="text-flame">.</span>
          </h1>
          <p className="text-[10px] font-mono uppercase tracking-widest text-ink-400 mt-1">
            Lead Engine · Internal
          </p>
        </div>

        <label className="block mb-2 font-mono text-[10px] uppercase tracking-widest text-ink-400">
          Access key
        </label>
        <div className="relative">
          <KeyRound
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
          />
          <input
            type="password"
            autoFocus
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk_live_…"
            className="input w-full pl-9 font-mono"
          />
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={busy || key.length < 8}
          className="btn-primary w-full mt-5 flex items-center justify-center gap-2 disabled:opacity-30"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : 'Sign in'}
        </button>

        <p className="mt-6 text-[10px] font-mono text-ink-500 text-center leading-relaxed">
          Key is validated server-side on every request.
          <br />
          No bypass possible from the browser.
        </p>
      </form>
    </div>
  );
}
