import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { isAdmin } from '@/data/remote';
import { ACCENTS, AccentKey } from '@/theme/tokens';
import { T, H, Screen, DetailHeader, Card } from '@/components/base';
import { Icon } from '@/components/Icon';

const PRIVACY_URL = 'https://claude.ai/code/artifact/cbfe9163-a8b9-4782-aa96-b03a3e1a5453';
const TERMS_URL = 'https://claude.ai/code/artifact/014180b9-2f62-4334-9899-91935f62aa8c';
const GUIDELINES_URL = 'https://claude.ai/code/artifact/4f0d2c5d-8eef-465b-a203-8df8abd06a6b';

export default function Settings() {
  const { c, accent, setAccent, mode, setMode } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { resetAll } = useStore();
  const { configured, session, signOut, deleteAccount } = useAuth();
  const [busy, setBusy] = useState(false);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    if (configured && session) isAdmin().then(setAdmin).catch(() => {});
  }, [configured, session]);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          resetAll();
          router.replace('/');
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete account',
      'This permanently removes your profile, saved places, itinerary, posts, and comments. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete my account',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            const { error } = await deleteAccount();
            setBusy(false);
            if (error) {
              Alert.alert('Could not delete account', error);
              return;
            }
            resetAll();
            router.replace('/');
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <DetailHeader title="Settings" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 30 }}>
        {/* Appearance */}
        <SectionLabel>Appearance</SectionLabel>
        <Card style={{ padding: 15 }}>
          <T style={{ fontSize: 13, fontWeight: '700', color: c.muted, marginBottom: 10 }}>Accent color</T>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {(Object.keys(ACCENTS) as AccentKey[]).map((k) => (
              <Pressable key={k} onPress={() => setAccent(k)} style={{ alignItems: 'center', gap: 4 }}>
                <View
                  style={{
                    width: 40, height: 40, borderRadius: 999, backgroundColor: ACCENTS[k].main,
                    borderWidth: accent === k ? 3 : 0, borderColor: c.ink,
                  }}
                />
              </Pressable>
            ))}
          </View>
          <View style={{ height: 1, backgroundColor: c.line, marginVertical: 14 }} />
          <T style={{ fontSize: 13, fontWeight: '700', color: c.muted, marginBottom: 10 }}>Theme</T>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['system', 'light', 'dark'] as const).map((m) => {
              const on = mode === m;
              return (
                <Pressable key={m} onPress={() => setMode(m)} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent50 : c.surface }}>
                  <T style={{ fontSize: 13, fontWeight: '700', color: on ? c.accent : c.inkSoft, textTransform: 'capitalize' }}>{m}</T>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Legal */}
        <SectionLabel>About</SectionLabel>
        <Card>
          <LinkRow label="Privacy Policy" onPress={() => Linking.openURL(PRIVACY_URL)} />
          <Divider />
          <LinkRow label="Terms of Service" onPress={() => Linking.openURL(TERMS_URL)} />
          <Divider />
          <LinkRow label="Community Guidelines" onPress={() => Linking.openURL(GUIDELINES_URL)} />
        </Card>

        {/* Moderation — admins only */}
        {admin && (
          <>
            <SectionLabel>Moderation</SectionLabel>
            <Card>
              <LinkRow label="Report queue" onPress={() => router.push('/admin')} />
            </Card>
          </>
        )}

        {/* Account */}
        <SectionLabel>Account</SectionLabel>
        <Card>
          {configured && session && (
            <>
              <LinkRow label="Sign out" onPress={handleSignOut} />
              <Divider />
            </>
          )}
          <LinkRow
            label="Reset local data"
            onPress={() =>
              Alert.alert('Reset local data', 'This clears onboarding, saved spots and your itinerary on this device.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: resetAll },
              ])
            }
          />
          {configured && session && (
            <>
              <Divider />
              <LinkRow label={busy ? 'Deleting…' : 'Delete account'} danger onPress={busy ? () => {} : handleDelete} />
            </>
          )}
        </Card>

        <T style={{ textAlign: 'center', color: c.muted, fontSize: 12, marginTop: 24 }}>TRIP v1.0.0</T>
      </ScrollView>
    </Screen>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return <T style={{ fontSize: 12, fontWeight: '800', color: c.muted, letterSpacing: 0.8, marginTop: 24, marginBottom: 10 }}>{String(children).toUpperCase()}</T>;
}
function Divider() {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.line, marginLeft: 15 }} />;
}
function LinkRow({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15 }}>
      <T style={{ fontSize: 15, fontWeight: '600', color: danger ? c.rose : c.ink }}>{label}</T>
      <Icon name="chevron" size={18} stroke={c.muted} sw={2} />
    </Pressable>
  );
}
