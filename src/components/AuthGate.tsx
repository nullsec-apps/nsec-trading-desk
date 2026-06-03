import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Radio, ShieldCheck, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EmailSignIn } from './EmailSignIn';
import { PreAuthTicker } from './PreAuthTicker';
import { DashboardShell } from './DashboardShell';

/**
 * Pre-auth landing terminal + Supabase auth gate. Shows the headline, a live
 * pre-auth ticker proof module, and the email sign-in form. Once authed, swaps
 * to DashboardShell.
 */
export function AuthGate() {
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#0A0E0D] flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-[#5C6B66] font-display text-xs tracking-[0.18em] uppercase">
          <Loader2 size={16} className="animate-spin text-[#1FE07A]" strokeWidth={2} />
          booting desk…
        </div>
      </div>
    );
  }

  if (session?.user) {
    return <DashboardShell userId={session.user.id} userEmail={session.user.email ?? null} />;
  }

  return (
    <div className="min-h-screen w-full bg-[#0A0E0D] text-[#D6E4DF] flex flex-col overflow-x-hidden">
      {/* top pre-auth ticker proof module */}
      <PreAuthTicker />

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10 sm:py-16">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* headline column */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center gap-2">
              <span className="inline-block w-[7px] h-[7px] rounded-full bg-[#1FE07A] live-pulse" />
              <span className="font-display text-[10px] tracking-[0.3em] uppercase text-[#1FE07A]">
                nsecdesk
              </span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl leading-[1.05] tracking-tight text-[#D6E4DF]">
              NSECDESK{' '}
              <span className="text-[#5C6B66]">//</span>{' '}
              <span className="text-[#1FE07A]">your market,</span>
              <br className="hidden sm:block" /> one terminal
            </h1>

            <p className="font-sans text-sm sm:text-base text-[#5C6B66] leading-relaxed max-w-md">
              Sign in to track live prices, build a watchlist, and read candlesticks
              across 15m–1D — streamed straight from Binance over WebSocket.
            </p>

            <div className="flex flex-col gap-2.5 pt-1">
              {[
                { icon: Radio, t: 'Live WebSocket tape — every tick, color-flashed' },
                { icon: Zap, t: 'Candlestick + volume across 15m / 1H / 4H / 1D' },
                { icon: ShieldCheck, t: 'Email sign-in · your watchlist persists' },
              ].map((row, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.12 + i * 0.07, ease: 'easeOut' }}
                  className="flex items-center gap-2.5 font-sans text-xs text-[#5C6B66]"
                >
                  <row.icon size={14} strokeWidth={1.5} className="text-[#1FE07A] shrink-0" />
                  <span>{row.t}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* auth column */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
            className="w-full max-w-md mx-auto lg:mx-0"
          >
            <div className="border border-[#1F2A27] bg-[#111817] p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#1F2A27]">
                <span className="font-display text-xs tracking-[0.2em] uppercase text-[#D6E4DF]">
                  access desk
                </span>
                <span className="font-sans text-[10px] tracking-[0.16em] uppercase text-[#5C6B66]">
                  secure · email
                </span>
              </div>
              <EmailSignIn />
            </div>
            <p className="font-sans text-[10px] text-[#5C6B66]/70 text-center mt-3 tracking-wide">
              market data: binance · coingecko — your data: encrypted at rest
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default AuthGate;
