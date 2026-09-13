import React, { useState } from 'react';
import { View, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { INTERESTS, REGIONS } from '@/data';
import { Icon } from '@/components/Icon';
import { Eyebrow } from '@/components/ui';
import { T, H, Button } from '@/components/base';

const STEPS = 4;

export default function Onboarding() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completeOnboarding } = useStore();
  const { configured, user } = useAuth();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [country, setCountry] = useState<string | null>(null);
  const [interests, setInterests] = useState<Set<string>>(new Set());

  const toggle = (k: string) =>
    setInterests((prev) => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  const canNext = step === 0 ? true : step === 1 ? name.trim().length > 0 : step === 2 ? !!country : interests.size > 0;

  const finish = (skip?: boolean) => {
    // `country` holds a REGIONS key (e.g. "asia"); store the emoji since Flag
    // and post authorship elsewhere render `profile.country` directly as text.
    const emoji = country ? REGIONS.find((r) => r.key === country)?.emoji ?? null : null;
    const nextInterests = skip ? [] : [...interests];
    const displayName = skip ? undefined : name.trim() || undefined;
    completeOnboarding({ country: skip ? null : emoji, interests: nextInterests, displayName });
    if (configured && user) {
      const row: Record<string, unknown> = { country: skip ? null : emoji, interests: nextInterests };
      if (displayName) row.display_name = displayName;
      supabase
        .from('profiles')
        .update(row)
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) console.warn('profile sync failed', error.message);
        });
    }
    router.replace('/(tabs)');
  };

  const next = () => (step < STEPS - 1 ? setStep(step + 1) : finish());

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.paper }}>
      <View style={{ flex: 1, paddingTop: insets.top + 12 }}>
        {/* Back — there was no way out of a step at all before this: no
            hardware back on iOS, progress dots aren't pressable, and Continue
            is disabled until the step's own requirement is met. A name
            typo on step 1 had no fix. */}
        <View style={{ height: 28, paddingHorizontal: 20 }}>
          {step > 0 && (
            <Pressable
              onPress={() => setStep(step - 1)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={{ width: 36, height: 28, justifyContent: 'center' }}
            >
              <Icon name="back" size={20} stroke={c.ink} sw={2.2} />
            </Pressable>
          )}
        </View>
        {/* progress */}
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 24, paddingTop: 8 }}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View key={i} style={{ flex: 1, height: 4, borderRadius: 999, backgroundColor: i <= step ? c.accent : c.line }} />
          ))}
        </View>

        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          {step === 0 && <Welcome />}
          {step === 1 && <PickName name={name} setName={setName} />}
          {step === 2 && <PickRegion region={country} setRegion={setCountry} />}
          {step === 3 && <PickInterests interests={interests} toggle={toggle} />}
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: insets.bottom + 20, gap: 10 }}>
          <Button
            label={step === 0 ? 'Get started' : step === STEPS - 1 ? 'Explore Korea →' : 'Continue'}
            onPress={next}
            disabled={!canNext}
          />
          <Pressable onPress={() => finish(true)} style={{ alignItems: 'center', paddingVertical: 6 }}>
            <T style={{ color: c.muted, fontSize: 14, fontWeight: '600' }}>Skip for now</T>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function PickName({ name, setName }: { name: string; setName: (v: string) => void }) {
  const { c } = useTheme();
  return (
    // The last step still on a fixed flex:1 View, and the only one that raises
    // the keyboard. Once KeyboardAvoidingView shrank the content area, the
    // ~250pt of heading + copy + field no longer fit, and since React Native
    // does not clip overflow the field spilled downward and rendered *through*
    // the Continue button. Apple hit exactly this on an iPad Air (Guideline 4).
    // Same ScrollView treatment as Welcome / PickRegion / PickInterests.
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingTop: 32, paddingBottom: 16 }}
    >
      <Eyebrow>Nice to meet you</Eyebrow>
      <H style={{ fontSize: 28, lineHeight: 33, marginTop: 12 }}>What should we call you?</H>
      <T style={{ fontSize: 14.5, color: c.inkSoft, marginTop: 8, lineHeight: 21 }}>
        This is the name other travelers see on your tips and routes.
      </T>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={c.muted}
        autoFocus
        maxLength={40}
        returnKeyType="done"
        style={{
          marginTop: 22, backgroundColor: c.surface, borderWidth: 1.5, borderColor: name ? c.accent : c.line,
          borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, fontSize: 18, color: c.ink, fontFamily: 'Pretendard-SemiBold',
        }}
      />
    </ScrollView>
  );
}

function Welcome() {
  const { c, shadow } = useTheme();
  const rows: [string, string, string][] = [
    ['🧍', 'Solo-friendly, English menus, fair prices', 'Every spot tagged by travelers like you'],
    ['🎬', 'Tied to the K-content you love', 'Filming locations, idol haunts, drama cafes'],
    ['🤝', 'A community that gets it', 'Tips, guides & buddies, built for foreigners'],
  ];
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 40, paddingBottom: 20 }}>
      <View
        style={{
          width: 70, height: 70, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
          backgroundColor: c.accent, marginBottom: 26, ...(shadow as object),
        }}
      >
        <Icon name="pin" size={38} stroke={c.paper} sw={2} />
      </View>
      <Eyebrow>For travelers in Korea</Eyebrow>
      <H style={{ fontSize: 33, lineHeight: 38, marginTop: 12 }}>
        The real Korea,{'\n'}
        <H italic style={{ fontSize: 33, color: c.accent }}>
          beyond Myeongdong.
        </H>
      </H>
      <T style={{ fontSize: 15.5, lineHeight: 24, color: c.inkSoft, marginTop: 16 }}>
        Local spots from your favorite K-dramas, films and idols, tagged with what actually matters to a foreign traveler.
      </T>
      <View style={{ marginTop: 26, gap: 12 }}>
        {rows.map(([e, t, s]) => (
          <View key={t} style={{ flexDirection: 'row', gap: 13, alignItems: 'flex-start' }}>
            <View style={{ width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface2 }}>
              <T style={{ fontSize: 20 }}>{e}</T>
            </View>
            <View style={{ flex: 1 }}>
              <T style={{ fontSize: 14.5, fontWeight: '700', lineHeight: 19 }}>{t}</T>
              <T style={{ fontSize: 13, color: c.inkSoft, marginTop: 2, lineHeight: 18 }}>{s}</T>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function PickRegion({ region, setRegion }: { region: string | null; setRegion: (k: string) => void }) {
  const { c } = useTheme();
  return (
    // Was a fixed flex:1 list with no ScrollView (unlike Welcome, which has
    // one) — 8 rows at minHeight 52 run to ~480pt, taller than the space
    // left above the button on an SE-size screen, so "Somewhere else" was
    // unreachable.
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 22, paddingBottom: 12 }}>
      <H style={{ fontSize: 26, lineHeight: 30 }}>Where are you visiting from?</H>
      <T style={{ fontSize: 14, color: c.inkSoft, marginTop: 6 }}>We'll surface tips from travelers in similar shoes.</T>
      <View style={{ gap: 9, marginTop: 16 }}>
        {REGIONS.map((r) => {
          const on = region === r.key;
          return (
            <Pressable
              key={r.key}
              onPress={() => setRegion(r.key)}
              style={{
                minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14,
                borderRadius: 14, backgroundColor: on ? c.accent50 : c.surface,
                borderWidth: 1.5, borderColor: on ? c.accent : c.line,
              }}
            >
              <T style={{ fontSize: 24 }}>{r.emoji}</T>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <T style={{ fontSize: 15.5, fontWeight: '700' }}>{r.label}</T>
                {!!r.hint && <T style={{ fontSize: 12, color: c.muted }}>{r.hint}</T>}
              </View>
              <View
                style={{
                  width: 21, height: 21, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
                  borderWidth: on ? 0 : 1.5, borderColor: c.line, backgroundColor: on ? c.accent : 'transparent',
                }}
              >
                {on && <Icon name="check" size={13} stroke={c.paper} sw={2.6} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function PickInterests({ interests, toggle }: { interests: Set<string>; toggle: (k: string) => void }) {
  const { c } = useTheme();
  return (
    // Was a fixed flex:1 grid with no ScrollView — 12 tiles at 2-per-row run
    // taller than the space available on smaller phones, and the last row
    // rendered under the Continue button with no way to reach it.
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 22, paddingBottom: 10 }}>
      <H style={{ fontSize: 26, lineHeight: 30 }}>What brought you to Korea?</H>
      <T style={{ fontSize: 14, color: c.inkSoft, marginTop: 6 }}>Pick a few, we'll tune your feed and themes.</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, gap: 9 }}>
        {INTERESTS.map((it) => {
          const on = interests.has(it.key);
          return (
            <Pressable
              key={it.key}
              onPress={() => toggle(it.key)}
              // width alone, no flexGrow: with it, an odd tile count stretched
              // the last tile to fill the row and broke the 2-up grid — the
              // same bug already found and fixed in RouteFeedbackBar.
              style={{
                width: '48%', justifyContent: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 14,
                borderRadius: 14, backgroundColor: on ? c.accent : c.surface,
                borderWidth: 1.5, borderColor: on ? c.accent : c.line,
              }}
            >
              <T style={{ fontSize: 25 }}>{it.emoji}</T>
              <T style={{ fontSize: 14.5, fontWeight: '700', color: on ? c.paper : c.ink }}>{it.label}</T>
              {on && (
                <View style={{ position: 'absolute', top: 11, right: 11 }}>
                  <Icon name="check" size={17} stroke={c.paper} sw={2.4} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
