import React, { useState } from 'react';
import { View, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useRemoteContent } from '@/lib/remoteData';
import { haptic } from '@/lib/haptics';
import { sendFeedback, FEEDBACK_KINDS, FeedbackKind } from '@/lib/feedback';
import { Screen, DetailHeader, T, H, Button } from '@/components/base';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';

// Help & feedback. Reached from Settings, and from a place's "Something wrong
// here?" — in that case `place` arrives as a param and the report is attached
// to it, so nobody has to type "the cafe street one in Hapjeong".
//
// A ScrollView, not a fixed View: this screen raises the keyboard, and the
// onboarding name step is what an App Store reviewer rejected for exactly that
// (see the comment in app/onboarding.tsx).

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Opening hours or a price look wrong',
    a: 'They probably are. Most places come from Korea’s tourism board data, which goes stale on its own — a place changes its hours and nobody updates the record. Tell us which place and we’ll fix that row. This is the single most useful thing you can send us.',
  },
  {
    q: 'Do I need an account?',
    a: 'Not to browse, plan a trip, or send feedback. An account only matters for the things that need to be yours: posting, saving, voting on a place’s tags.',
  },
  {
    q: 'Why are some places missing English info?',
    a: 'The catalogue covers about 4,000 Seoul places, and the amount of English varies a lot by source. Where it is thin, the Foreigner Fit tags other travellers vote on are usually a better signal than the description.',
  },
  {
    q: 'Can I get my data deleted?',
    a: 'Yes. Settings → Delete account removes your profile and what you posted. There is no way to undo it, so we ask twice.',
  },
];

export default function Support() {
  const { c } = useTheme();
  const { showToast } = useToast();
  const { placeBySlug } = useRemoteContent();
  const { place: placeSlug } = useLocalSearchParams<{ place?: string }>();
  const place = placeSlug ? placeBySlug[placeSlug] : undefined;

  const [kind, setKind] = useState<FeedbackKind>(placeSlug ? 'wrong' : 'confusing');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const submit = async () => {
    const text = body.trim();
    if (!text) { showToast('Tell us what happened first'); return; }
    setBusy(true);
    try {
      await sendFeedback({ kind, body: text, placeSlug: placeSlug || undefined });
      haptic.success();
      setSent(true);
      setBody('');
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Screen>
        <DetailHeader title="Help & feedback" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <T style={{ fontSize: 44 }}>🙏</T>
          <H style={{ fontSize: 22, marginTop: 14, textAlign: 'center' }}>Got it — thank you</H>
          <T style={{ fontSize: 14.5, color: c.inkSoft, textAlign: 'center', marginTop: 10, lineHeight: 21 }}>
            This goes straight to the person who builds BADA. If you told us about a
            specific place, that row usually gets fixed within a few days.
          </T>
          <Button label="Send something else" variant="soft" style={{ marginTop: 26 }} onPress={() => setSent(false)} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <DetailHeader title="Help & feedback" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        >
          {!!place && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.accent50, borderRadius: 14, padding: 13, marginTop: 4 }}>
              <Icon name="pin" size={17} stroke={c.accent} sw={2} />
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 11.5, fontWeight: '800', color: c.accent, letterSpacing: 0.4 }}>ABOUT THIS PLACE</T>
                <T style={{ fontSize: 14.5, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>{place.name}</T>
              </View>
            </View>
          )}

          <T style={{ fontSize: 12, fontWeight: '800', color: c.muted, letterSpacing: 0.8, marginTop: 24, marginBottom: 10 }}>
            WHAT KIND OF THING IS IT?
          </T>
          <View style={{ gap: 8 }}>
            {FEEDBACK_KINDS.map((k) => {
              const on = kind === k.key;
              return (
                <Pressable
                  key={k.key}
                  onPress={() => { haptic.tick(); setKind(k.key); }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={{
                    borderRadius: 14, padding: 13,
                    borderWidth: on ? 1.5 : 1,
                    borderColor: on ? c.accent : c.line,
                    backgroundColor: on ? c.accent50 : c.surface,
                  }}
                >
                  <T style={{ fontSize: 14.5, fontWeight: '700', color: on ? c.accent : c.ink }}>{k.label}</T>
                  <T style={{ fontSize: 12.5, color: c.muted, marginTop: 2 }}>{k.hint}</T>
                </Pressable>
              );
            })}
          </View>

          <T style={{ fontSize: 12, fontWeight: '800', color: c.muted, letterSpacing: 0.8, marginTop: 24, marginBottom: 8 }}>
            WHAT HAPPENED?
          </T>
          <TextInput
            value={body}
            onChangeText={setBody}
            multiline
            placeholder={place ? `What’s off about ${place.name}?` : 'The more specific, the faster we can fix it.'}
            placeholderTextColor={c.muted}
            maxLength={4000}
            style={{
              minHeight: 130, textAlignVertical: 'top',
              backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 14,
              padding: 14, fontSize: 15, lineHeight: 21, color: c.ink, fontFamily: 'Pretendard',
            }}
          />
          <T style={{ fontSize: 11.5, color: c.muted, marginTop: 8, lineHeight: 17 }}>
            Your app version and device are attached automatically. No account needed.
          </T>

          <Button label={busy ? 'Sending…' : 'Send'} onPress={submit} disabled={busy} style={{ marginTop: 16 }} />

          <T style={{ fontSize: 12, fontWeight: '800', color: c.muted, letterSpacing: 0.8, marginTop: 34, marginBottom: 10 }}>
            COMMON QUESTIONS
          </T>
          <View style={{ backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
            {FAQ.map((f, i) => {
              const open = openFaq === i;
              return (
                <View key={i} style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.line }}>
                  <Pressable
                    onPress={() => { haptic.tick(); setOpenFaq(open ? null : i); }}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 15 }}
                  >
                    <T style={{ flex: 1, fontSize: 14.5, fontWeight: '600' }}>{f.q}</T>
                    <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
                      <Icon name="chevron" size={16} stroke={c.muted} sw={2} />
                    </View>
                  </Pressable>
                  {open && (
                    <T style={{ fontSize: 13.5, color: c.inkSoft, lineHeight: 20, paddingHorizontal: 15, paddingBottom: 15 }}>
                      {f.a}
                    </T>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
