import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, TextInput, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useRemoteContent } from '@/lib/remoteData';
import { isSupabaseConfigured } from '@/lib/supabase';
import { fetchBuddyMessages, sendBuddyMessage, friendlyError } from '@/data/remote';
import { BuddyMessage } from '@/data/types';
import { T, Screen, DetailHeader } from '@/components/base';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { ReportSheet } from '@/components/ReportSheet';
import { useToast } from '@/components/Toast';
import { haptic } from '@/lib/haptics';

const POLL_MS = 4000;

// Private group chat for a buddy plan — host + accepted members only (RLS
// enforces this server-side; anyone else gets an empty, read-proof room).
// This is the safety story: you can coordinate a meetup without ever handing
// a stranger your phone number, and the conversation stays reportable.
export default function BuddyChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useStore();
  const { user } = useAuth();
  const { buddies } = useRemoteContent();
  const { showToast } = useToast();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<BuddyMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const buddy = buddies.find((b) => b.id === id);

  // Load + poll while the screen is open. Polling (vs realtime) keeps this
  // dependency-free and battery-cheap at MVP scale.
  useEffect(() => {
    if (!id || !isSupabaseConfigured) return;
    let alive = true;
    const load = () => fetchBuddyMessages(id).then((m) => { if (alive) setMessages(m); }).catch(() => {});
    load();
    const timer = setInterval(load, POLL_MS);
    return () => { alive = false; clearInterval(timer); };
  }, [id]);

  useEffect(() => {
    // Follow the newest message.
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages.length]);

  const send = async () => {
    if (!draft.trim() || !id || sending) return;
    setSending(true);
    const body = draft.trim();
    setDraft('');
    try {
      const created = await sendBuddyMessage(id, body, profile.displayName || 'Traveler', profile.country);
      setMessages((prev) => (prev.some((m) => m.id === created.id) ? prev : [...prev, created]));
      haptic.tick();
    } catch (e) {
      setDraft(body); // give the text back rather than losing it
      console.warn('sendBuddyMessage failed', e);
      showToast(friendlyError(e, "Couldn't send — try again."));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen>
      <DetailHeader
        title={buddy ? `${buddy.emoji} ${buddy.activity}` : 'Group chat'}
        right={
          <Pressable onPress={() => setReportOpen(true)} hitSlop={10} style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
            <T style={{ fontSize: 20, color: c.muted, fontWeight: '800' }}>···</T>
          </Pressable>
        }
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Safety note pinned at the top of every chat */}
          <View style={{ backgroundColor: c.gold50, borderRadius: 12, padding: 10, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <T style={{ fontSize: 14 }}>🛟</T>
            <T style={{ flex: 1, fontSize: 12, lineHeight: 17, color: c.gold700, fontWeight: '600' }}>
              Only the host and accepted members can see this chat. Meet in public, and report anything off via ···
            </T>
          </View>

          {messages.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
              <T style={{ fontSize: 26 }}>👋</T>
              <T style={{ fontSize: 13.5, color: c.muted, marginTop: 8, textAlign: 'center', lineHeight: 19 }}>
                Say hi and pin down the details —{'\n'}exact spot, time, how to spot each other.
              </T>
            </View>
          )}

          {messages.map((m, i) => {
            const mine = m.senderId === user?.id;
            const prev = messages[i - 1];
            const showName = !mine && (!prev || prev.senderId !== m.senderId);
            return (
              <View key={m.id} style={{ flexDirection: 'row', justifyContent: mine ? 'flex-end' : 'flex-start', gap: 8 }}>
                {!mine && (
                  <View style={{ width: 30 }}>
                    {showName && <Avatar name={m.senderName} size={30} />}
                  </View>
                )}
                <View style={{ maxWidth: '76%' }}>
                  {showName && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3, marginLeft: 4 }}>
                      <T style={{ fontSize: 11.5, fontWeight: '800', color: c.inkSoft }}>{m.senderName}</T>
                      <T style={{ fontSize: 11 }}>{m.senderCountry}</T>
                    </View>
                  )}
                  <View
                    style={{
                      backgroundColor: mine ? c.accent : c.surface,
                      borderWidth: mine ? 0 : 1,
                      borderColor: c.line,
                      borderRadius: 16,
                      borderTopLeftRadius: !mine && showName ? 5 : 16,
                      borderTopRightRadius: mine ? 5 : 16,
                      paddingHorizontal: 13,
                      paddingVertical: 9,
                    }}
                  >
                    <T style={{ fontSize: 14.5, lineHeight: 20, color: mine ? '#fff' : c.ink }}>{m.body}</T>
                  </View>
                  <T style={{ fontSize: 10.5, color: c.muted, marginTop: 3, alignSelf: mine ? 'flex-end' : 'flex-start', marginHorizontal: 4 }}>{m.when}</T>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Composer */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.paper, paddingBottom: (insets.bottom || 10) + 2 }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message the group…"
            placeholderTextColor={c.muted}
            style={{ flex: 1, maxHeight: 110, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 18, paddingHorizontal: 14, paddingTop: 9, paddingBottom: 9, fontSize: 14.5, color: c.ink, fontFamily: 'Jakarta' }}
            multiline
          />
          <Pressable
            onPress={send}
            disabled={!draft.trim() || sending}
            style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: draft.trim() ? c.accent : c.surface2, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="arrow" size={19} stroke={draft.trim() ? '#fff' : c.muted} sw={2.4} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} target={{ type: 'buddy', id: id ?? '', authorId: buddy?.authorId }} />
    </Screen>
  );
}
