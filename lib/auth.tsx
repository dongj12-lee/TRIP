import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './supabase';

// Browsing BADA — places, guides, and the trip planner — needs no account, so
// the app must not open on a sign-up wall. `guest` records that the traveller
// chose to look around first; it only gates the parts that genuinely need a
// server identity (posting, comments, buddy meetups), which prompt to sign in
// at the point of use. Persisted so the choice survives a restart.
const GUEST_KEY = 'bada.guest.v1';

type AuthValue = {
  ready: boolean;
  configured: boolean;
  session: Session | null;
  user: User | null;
  /** True when browsing without an account. Never true while signed in. */
  guest: boolean;
  continueAsGuest: () => void;
  /** Leave guest mode to go sign in / sign up. */
  exitGuest: () => void;
  /**
   * Returns `signedIn: true` when the project has email confirmation off and
   * Supabase handed back a session straight away, so the caller can go into
   * the app instead of showing a 'check your email' screen that never applies.
   */
  signUp: (email: string, password: string) => Promise<{ error: string | null; signedIn: boolean }>;
  /** Re-send the sign-up confirmation email when the first one never arrived. */
  resendConfirmation: (email: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Supabase's raw auth errors are written for developers ("Invalid login
 * credentials"), and the most common one is actively misleading: a traveller
 * who signed up but hasn't clicked the confirmation link reads it as a wrong
 * password. Map the cases people actually hit onto something actionable.
 */
export function authErrorText(err: { message?: string; code?: string } | null): string | null {
  if (!err) return null;
  const code = err.code ?? '';
  const msg = (err.message ?? '').toLowerCase();
  if (code === 'email_not_confirmed' || msg.includes('not confirmed'))
    return 'Confirm your email first. Check your inbox for the link we sent, then sign in.';
  if (code === 'invalid_credentials' || msg.includes('invalid login'))
    return "That email and password don't match. If you just signed up, confirm your email first.";
  if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered'))
    return 'That email already has an account. Try signing in instead.';
  if (code === 'over_email_send_rate_limit' || msg.includes('rate limit') || msg.includes('too many'))
    return 'Too many attempts just now. Wait a minute and try again.';
  if (code === 'weak_password' || msg.includes('password should be'))
    return 'Pick a longer password, at least 6 characters.';
  if (code === 'email_address_invalid' || msg.includes('is invalid'))
    return "That email address doesn't look right. Check it and try again.";
  if (msg.includes('network') || msg.includes('fetch'))
    return "Couldn't reach the server. Check your connection and try again.";
  if (code === 'unexpected_failure' || msg.includes('database error') || msg.includes('unexpected_failure'))
    return 'Something went wrong on our end. Please try again in a moment.';

  // Never render the raw payload. On a 5xx, GoTrue serializes the ENTIRE HTTP
  // response into `message` — status, headers, set-cookie, body — and this
  // fallback used to print it verbatim, filling the sign-up screen with a wall
  // of JSON. Only pass through something that actually reads like a sentence.
  const raw = (err.message ?? '').trim();
  const looksHuman = raw.length > 0 && raw.length <= 120 && !/[{}"\[\]]|https?:\/\//.test(raw);
  return looksHuman ? raw : 'Something went wrong. Try again.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(GUEST_KEY)
      .then((v) => { if (v === '1') setGuest(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Signing in supersedes guest mode.
  useEffect(() => {
    if (session && guest) {
      setGuest(false);
      AsyncStorage.removeItem(GUEST_KEY).catch(() => {});
    }
  }, [session, guest]);

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      configured: isSupabaseConfigured,
      session,
      user: session?.user ?? null,
      guest: guest && !session,
      continueAsGuest: () => {
        setGuest(true);
        AsyncStorage.setItem(GUEST_KEY, '1').catch(() => {});
      },
      exitGuest: () => {
        setGuest(false);
        AsyncStorage.removeItem(GUEST_KEY).catch(() => {});
      },
      signUp: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({ email, password });
        return { error: authErrorText(error), signedIn: !!data?.session };
      },
      resendConfirmation: async (email) => {
        const { error } = await supabase.auth.resend({ type: 'signup', email });
        return { error: authErrorText(error) };
      },
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: authErrorText(error) };
      },
      signOut: async () => {
        await supabase.auth.signOut();
        // Signing out returns you to the sign-in screen, not to guest browsing.
        setGuest(false);
        AsyncStorage.removeItem(GUEST_KEY).catch(() => {});
      },
      deleteAccount: async () => {
        const { error } = await supabase.rpc('delete_account');
        if (!error) await supabase.auth.signOut();
        // Routed through the same sanitizer as the auth errors above: a Postgres
        // failure here would otherwise put a raw SQL error in an Alert.
        return { error: authErrorText(error) };
      },
    }),
    [ready, session, guest],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
