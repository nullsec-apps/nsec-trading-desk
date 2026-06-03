import { useState } from 'react';
import { Mail, Loader2, AlertTriangle, CheckCircle2, ArrowRight, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Mode = 'magic' | 'password';

function validEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/**
 * Mono-styled email sign-in / sign-up. Supports a passwordless magic-link
 * (signInWithOtp) and an email+password flow with inline validation,
 * loading, error, and sent states. Hairline-bordered, zero rounded chrome.
 */
export function EmailSignIn() {
  const [mode, setMode] = useState<Mode>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const reset = () => {
    setError(null);
    setSent(false);
  };

  const submitMagic = async () => {
    reset();
    if (!validEmail(email)) {
      setError('enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin },
      });
      if (err) throw err;
      setSent(true);
    } catch (e: any) {
      setError(e?.message || 'failed to send link');
    } finally {
      setLoading(false);
    }
  };

  const submitPassword = async () => {
    reset();
    if (!validEmail(email)) {
      setError('enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const { error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (err) throw err;
        setSent(true);
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
        // onAuthStateChange in AuthGate will swap the view
      }
    } catch (e: any) {
      setError(e?.message || 'authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (mode === 'magic') submitMagic();
    else submitPassword();
  };

  if (sent) {
    return (
      <div className="border border-[#1F2A27] bg-[#111817] p-5 fade-in-up">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={20} className="text-[#1FE07A] mt-0.5 shrink-0" strokeWidth={2} />
          <div className="min-w-0">
            <p className="font-display text-sm text-[#D6E4DF] tracking-wide">
              CHECK YOUR INBOX
            </p>
            <p className="text-xs text-[#5C6B66] font-sans mt-1.5 leading-relaxed break-words">
              {mode === 'magic'
                ? 'A sign-in link is on its way to '
                : 'A confirmation link is on its way to '}
              <span className="text-[#D6E4DF]">{email.trim()}</span>. Open it to
              enter the desk.
            </p>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setPassword('');
              }}
              className="mt-3 text-[11px] font-display uppercase tracking-wider text-[#1FE07A] hover:opacity-70 transition-opacity duration-150"
            >
              ← use a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full fade-in-up">
      {/* mode toggle */}
      <div className="flex border border-[#1F2A27] mb-4">
        {(
          [
            { k: 'magic' as Mode, label: 'magic link' },
            { k: 'password' as Mode, label: 'password' },
          ]
        ).map((m, i) => {
          const active = mode === m.k;
          return (
            <button
              key={m.k}
              type="button"
              onClick={() => {
                setMode(m.k);
                reset();
              }}
              className={[
                'flex-1 h-9 font-display text-[11px] uppercase tracking-[0.15em] transition-colors duration-150',
                i === 1 ? 'border-l border-[#1F2A27]' : '',
                active
                  ? 'bg-[#0A0E0D] text-[#1FE07A]'
                  : 'bg-transparent text-[#5C6B66] hover:text-[#D6E4DF]',
              ].join(' ')}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block font-display text-[10px] uppercase tracking-[0.18em] text-[#5C6B66] mb-1.5">
            email
          </label>
          <div className="flex items-center gap-2 px-3 h-12 border border-[#1F2A27] bg-[#0A0E0D] focus-within:border-[#1FE07A] transition-colors duration-200">
            <Mail size={15} className="text-[#5C6B66] shrink-0" strokeWidth={2} />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                reset();
              }}
              placeholder="you@desk.io"
              autoComplete="email"
              spellCheck={false}
              className="flex-1 bg-transparent outline-none text-[#D6E4DF] placeholder:text-[#5C6B66] font-sans tabular"
              style={{ fontSize: 16 }}
            />
          </div>
        </div>

        {mode === 'password' ? (
          <div className="fade-in-up">
            <label className="block font-display text-[10px] uppercase tracking-[0.18em] text-[#5C6B66] mb-1.5">
              password
            </label>
            <div className="flex items-center gap-2 px-3 h-12 border border-[#1F2A27] bg-[#0A0E0D] focus-within:border-[#1FE07A] transition-colors duration-200">
              <Lock size={15} className="text-[#5C6B66] shrink-0" strokeWidth={2} />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  reset();
                }}
                placeholder="••••••••"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                className="flex-1 bg-transparent outline-none text-[#D6E4DF] placeholder:text-[#5C6B66] font-sans tabular"
                style={{ fontSize: 16 }}
              />
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-center gap-2 px-3 py-2.5 border border-[#FF4D5E]/40 bg-[#FF4D5E]/5 text-[#FF4D5E] text-xs font-sans fade-in-up">
            <AlertTriangle size={13} strokeWidth={2} className="shrink-0" />
            <span className="break-words">{error}</span>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="group w-full h-12 flex items-center justify-center gap-2 bg-[#1FE07A] text-[#0A0E0D] font-display text-sm uppercase tracking-[0.15em] hover:bg-[#17c96c] active:bg-[#13b561] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              {mode === 'magic'
                ? 'send sign-in link'
                : isSignUp
                ? 'create account'
                : 'sign in'}
              <ArrowRight
                size={15}
                strokeWidth={2.5}
                className="group-hover:translate-x-0.5 transition-transform duration-150"
              />
            </>
          )}
        </button>

        {mode === 'password' ? (
          <button
            type="button"
            onClick={() => {
              setIsSignUp((s) => !s);
              reset();
            }}
            className="w-full text-center text-[11px] font-sans text-[#5C6B66] hover:text-[#D6E4DF] transition-colors duration-150 pt-0.5"
          >
            {isSignUp
              ? 'have an account? sign in →'
              : 'no account? create one →'}
          </button>
        ) : (
          <p className="text-center text-[10px] font-sans text-[#5C6B66] leading-relaxed pt-0.5">
            no password needed — we email you a one-tap link
          </p>
        )}
      </div>
    </form>
  );
}

export default EmailSignIn;
