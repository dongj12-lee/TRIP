import React, { useState } from 'react';
import { View, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useAuth } from '@/lib/auth';
import { T, H, Button } from '@/components/base';
import { Icon } from '@/components/Icon';

export default function AuthScreen() {
  const { c, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, signUp, continueAsGuest, resendConfirmation } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentConfirm, setSentConfirm] = useState(false);
  const [resent, setResent] = useState<'idle' | 'busy' | 'done'>('idle');

  const field = {
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: c.ink, fontFamily: 'Pretendard',
  } as const;

  const submit = async () => {
    setError(null);
    if (!email.trim() || password.length < 6) {
      setError('Enter a valid email and a password of at least 6 characters.');
      return;
    }
    setBusy(true);
    const res = mode === 'signup' ? await signUp(email.trim(), password) : await signIn(email.trim(), password);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    // With email confirmation off, sign-up returns a live session, so drop the
    // traveller straight into the app rather than telling them to check a
    // mailbox that will never get anything.
    if (mode === 'signup' && !('signedIn' in res && res.signedIn)) {
      setSentConfirm(true);
    } else {
      router.replace('/');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.paper }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <View
          style={{
            width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
            backgroundColor: c.accent, marginBottom: 16, ...(shadow as object),
          }}
        >
          <Icon name="pin" size={32} stroke={c.paper} sw={2} />
        </View>

        <H style={{ fontSize: 28, lineHeight: 33 }}>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</H>
        <T style={{ fontSize: 14.5, color: c.inkSoft, marginTop: 6, lineHeight: 20 }}>
          {mode === 'signup'
            ? 'One account to save spots, post tips, and plan your trip.'
            : 'Sign in to pick up where you left off.'}
        </T>

        {sentConfirm ? (
          <View style={{ marginTop: 28, padding: 16, borderRadius: 14, backgroundColor: c.sage50 }}>
            <T style={{ fontSize: 14, color: c.sage700, fontWeight: '700' }}>Check your email</T>
            <T style={{ fontSize: 13, color: c.ink, marginTop: 6, lineHeight: 19 }}>
              We sent a confirmation link to {email}. Tap it, then come back and sign in.
            </T>
            <Button label="Back to sign in" variant="soft" style={{ marginTop: 16 }} onPress={() => { setSentConfirm(false); setMode('signin'); }} />
            {/* Confirmation mail is the single most common place to get stuck:
                it can be slow, or land in spam. Always offer another one. */}
            <Pressable
              onPress={async () => {
                if (resent === 'busy') return;
                setResent('busy');
                const { error: e } = await resendConfirmation(email.trim());
                setResent('done');
                if (e) setError(e);
              }}
              style={{ alignItems: 'center', paddingVertical: 12 }}
            >
              <T style={{ fontSize: 13, color: resent === 'done' ? c.muted : c.accent, fontWeight: '700' }}>
                {resent === 'busy' ? 'Sending…' : resent === 'done' ? 'Sent again, check spam too' : "Didn't get it? Send again"}
              </T>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={{ marginTop: 28, gap: 12 }}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={field}
                placeholderTextColor={c.muted}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password (min. 6 characters)"
                secureTextEntry
                autoCapitalize="none"
                style={field}
                placeholderTextColor={c.muted}
              />
            </View>

            {!!error && (
              <View style={{ marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: c.rose50 }}>
                <T style={{ fontSize: 13, color: c.rose700, fontWeight: '600' }}>{error}</T>
              </View>
            )}

            <Button
              label={busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
              onPress={submit}
              disabled={busy}
              style={{ marginTop: 20 }}
            />

            <Pressable onPress={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null); }} style={{ alignItems: 'center', marginTop: 18 }}>
              <T style={{ fontSize: 13.5, color: c.inkSoft }}>
                {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
                <T style={{ color: c.accent, fontWeight: '700' }}>{mode === 'signup' ? 'Sign in' : 'Sign up'}</T>
              </T>
            </Pressable>

            {/* Browsing places, guides and the trip planner needs no account.
                Posting and comments ask you to sign in when you reach them. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 26 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
              <T style={{ fontSize: 11.5, color: c.muted, fontWeight: '700', letterSpacing: 0.4 }}>OR</T>
              <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
            </View>
            <Button
              label="Look around first"
              variant="soft"
              style={{ marginTop: 16 }}
              onPress={() => { continueAsGuest(); router.replace('/'); }}
            />
            <T style={{ fontSize: 12, color: c.muted, textAlign: 'center', marginTop: 9, lineHeight: 17 }}>
              Browse spots, guides and plan a trip without an account.
            </T>
          </>
        )}

        <T style={{ fontSize: 11.5, color: c.muted, textAlign: 'center', marginTop: 'auto', paddingTop: 18, lineHeight: 16 }}>
          By continuing you agree to BADA's{' '}
          <T
            style={{ color: c.accent, fontWeight: '700' }}
            onPress={() => router.push('/legal/terms')}
          >
            Terms of Service
          </T>{' '}
          and{' '}
          <T
            style={{ color: c.accent, fontWeight: '700' }}
            onPress={() => router.push('/legal/privacy')}
          >
            Privacy Policy
          </T>
          .
        </T>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
