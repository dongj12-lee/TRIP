import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useRemoteContent } from '@/lib/remoteData';
import { isSupabaseConfigured } from '@/lib/supabase';
import { haptic } from '@/lib/haptics';
import { useToast } from '@/components/Toast';
import { fetchBuddyInterests, setInterestStatus } from '@/data/remote';
import { BuddyInterest } from '@/data/types';
import { T, H, Screen, DetailHeader, Card, Button } from '@/components/base';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { ReportSheet } from '@/components/ReportSheet';

// The buddy flow: request (with a short intro) → the host accepts/declines →
// accepted members + host talk in a private in-app group chat. Contact never
// requires sharing a phone number or socials; the host stays in control of
// who gets through (see migration-012).
export default function BuddyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { joined, toggleJoin, profile } = useStore();
  const { user } = useAuth();
  const { buddies, placeBySlug } = useRemoteContent();
  const { showToast } = useToast();
  const [liveInterests, setLiveInterests] = useState<BuddyInterest[] | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  const buddy = buddies.find((b) => b.id === id);

  useEffect(() => {
    if (!buddy || !isSupabaseConfigured) return;
    fetchBuddyInterests(buddy.id).then(setLiveInterests).catch(() => {});
  }, [buddy?.id]);

  if (!buddy) return <Screen><DetailHeader title="Plan" /></Screen>;

  const place = buddy.placeSlug ? placeBySlug[buddy.placeSlug] : null;
  const interests = liveInterests ?? buddy.interestedList;
  const isHost = !!user && user.id === buddy.authorId;
  const mine = user ? interests.find((i) => i.userId === user.id) : undefined;
  const requested = !!mine || joined.has(buddy.id);
  const myStatus: BuddyInterest['status'] | null = mine ? mine.status : requested ? 'pending' : null;

  const accepted = interests.filter((i) => i.status === 'accepted');
  const pending = interests.filter((i) => i.status === 'pending');
  // group_size is the total headcount including the host.
  const isFull = accepted.length + 1 >= buddy.groupSize;
  const canChat = isHost || myStatus === 'accepted';

  const sendRequest = (message: string) => {
    haptic.success();
    toggleJoin(buddy.id, message);
    setLiveInterests((prev) =>
      prev
        ? [...prev, { userId: user?.id, name: profile.displayName || 'Traveler', country: profile.country || '🌐', message, status: 'pending' }]
        : prev,
    );
    setRequestOpen(false);
    showToast('Request sent — the host will review it', '🙋');
  };

  const cancelRequest = () => {
    haptic.tick();
    toggleJoin(buddy.id);
    setLiveInterests((prev) => (prev ? prev.filter((i) => i.userId !== user?.id) : prev));
    showToast('Request cancelled');
  };

  const decide = (target: BuddyInterest, status: 'accepted' | 'declined') => {
    if (!target.userId) return;
    haptic.tick();
    setLiveInterests((prev) => (prev ? prev.map((i) => (i.userId === target.userId ? { ...i, status } : i)) : prev));
    setInterestStatus(buddy.id, target.userId, status).catch((e) => console.warn('setInterestStatus failed', e));
    if (status === 'accepted') showToast(`${target.name} is in — say hi in the chat`, '🎉');
  };

  return (
    <Screen>
      <DetailHeader
        title="Buddy plan"
        right={
          <Pressable onPress={() => setReportOpen(true)} hitSlop={10} style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
            <T style={{ fontSize: 20, color: c.muted, fontWeight: '800' }}>···</T>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', marginTop: 4 }}>
          <View style={{ width: 56, height: 56, borderRadius: 15, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ fontSize: 28 }}>{buddy.emoji}</T>
          </View>
          <View style={{ flex: 1 }}>
            <H style={{ fontSize: 22, lineHeight: 26 }}>{buddy.activity}</H>
            {isFull && (
              <View style={{ alignSelf: 'flex-start', marginTop: 6, backgroundColor: c.rose50, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999 }}>
                <T style={{ fontSize: 11.5, fontWeight: '800', color: c.rose700 }}>FULL</T>
              </View>
            )}
          </View>
        </View>

        <Card style={{ padding: 15, marginTop: 16, gap: 8 }}>
          <Row label="🕒 When" value={buddy.when} />
          <Row label="📍 Where" value={place ? `${place.name} · ${buddy.neighborhood}` : buddy.neighborhood} />
          <Row label="👥 Group" value={`${accepted.length + 1}/${buddy.groupSize} going`} />
        </Card>

        <T style={{ fontSize: 14.5, lineHeight: 22, color: c.ink, marginTop: 16 }}>{buddy.note}</T>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 }}>
          <Avatar name={buddy.author.name} size={34} />
          <View style={{ flex: 1 }}>
            <T style={{ fontSize: 11.5, color: c.muted, fontWeight: '700' }}>HOST</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <T style={{ fontSize: 14.5, fontWeight: '700' }}>{buddy.author.name}</T>
              <T style={{ fontSize: 13 }}>{buddy.author.country}</T>
            </View>
          </View>
        </View>

        {/* Safety — contact stays in the app, host gates who gets in */}
        <View style={{ backgroundColor: c.gold50, borderRadius: 14, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 18 }}>
          <T style={{ fontSize: 17 }}>🛟</T>
          <T style={{ flex: 1, fontSize: 12.5, lineHeight: 18, color: c.gold700, fontWeight: '600' }}>
            Keep contact in the app chat, meet in public places, and tell someone your plans. The host approves who joins.
          </T>
        </View>

        {/* Host: pending requests to review */}
        {isHost && pending.length > 0 && (
          <>
            <T style={{ fontSize: 14, fontWeight: '800', marginTop: 24, marginBottom: 12 }}>Requests ({pending.length})</T>
            <View style={{ gap: 12 }}>
              {pending.map((p) => (
                <View key={p.userId ?? p.name} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <Avatar name={p.name} size={34} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <T style={{ fontSize: 13, fontWeight: '700' }}>{p.name}</T>
                      <T style={{ fontSize: 12 }}>{p.country}</T>
                    </View>
                    {!!p.message && <T style={{ fontSize: 13, color: c.inkSoft, marginTop: 2 }}>{p.message}</T>}
                  </View>
                  <Pressable
                    onPress={() => decide(p, 'accepted')}
                    disabled={isFull}
                    style={{ width: 36, height: 36, borderRadius: 999, backgroundColor: isFull ? c.surface2 : c.sage, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icon name="check" size={17} stroke={isFull ? c.muted : '#fff'} sw={2.6} />
                  </Pressable>
                  <Pressable
                    onPress={() => decide(p, 'declined')}
                    style={{ width: 36, height: 36, borderRadius: 999, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icon name="close" size={15} stroke={c.inkSoft} sw={2.4} />
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Who's going */}
        <T style={{ fontSize: 14, fontWeight: '800', marginTop: 24, marginBottom: 12 }}>
          Going ({accepted.length + 1}/{buddy.groupSize})
        </T>
        <View style={{ gap: 12 }}>
          <PersonRow name={buddy.author.name} country={buddy.author.country} message="" tag="Host" />
          {accepted.map((p) => (
            <PersonRow key={p.userId ?? p.name} name={p.name} country={p.country} message={p.message} />
          ))}
          {accepted.length === 0 && (
            <T style={{ fontSize: 13, color: c.muted }}>No one yet — {isHost ? 'accept a request to fill the group.' : 'be the first to request a spot.'}</T>
          )}
        </View>

        {/* Pending, seen by non-hosts (social proof without exposing decisions) */}
        {!isHost && pending.length > 0 && (
          <T style={{ fontSize: 12.5, color: c.muted, marginTop: 14 }}>🙋 {pending.length} {pending.length === 1 ? 'request' : 'requests'} waiting for the host</T>
        )}
      </ScrollView>

      {/* Bottom action — depends on who you are and where your request stands */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 18, paddingBottom: insets.bottom + 12, backgroundColor: c.paper, borderTopWidth: 1, borderTopColor: c.line, gap: 8 }}>
        {canChat ? (
          <Button label="Open group chat 💬" onPress={() => router.push(`/buddy/chat/${buddy.id}`)} />
        ) : myStatus === 'pending' ? (
          <Button label="Requested — waiting for host · tap to cancel" variant="soft" onPress={cancelRequest} />
        ) : myStatus === 'declined' ? (
          <Button label="The host went with someone else this time" variant="soft" disabled onPress={() => {}} />
        ) : isFull ? (
          <Button label="This plan is full" variant="soft" disabled onPress={() => {}} />
        ) : (
          <Button label="Request to join 🙋" onPress={() => { haptic.tick(); setRequestOpen(true); }} />
        )}
      </View>

      <RequestSheet visible={requestOpen} onClose={() => setRequestOpen(false)} onSend={sendRequest} hostName={buddy.author.name} />
      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} target={{ type: 'buddy', id: buddy.id, authorId: buddy.authorId }} />
    </Screen>
  );
}

function PersonRow({ name, country, message, tag }: { name: string; country: string; message: string; tag?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
      <Avatar name={name} size={34} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T style={{ fontSize: 13, fontWeight: '700' }}>{name}</T>
          <T style={{ fontSize: 12 }}>{country}</T>
          {tag && (
            <View style={{ backgroundColor: c.accent50, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 999 }}>
              <T style={{ fontSize: 10.5, fontWeight: '800', color: c.accent }}>{tag}</T>
            </View>
          )}
        </View>
        {!!message && <T style={{ fontSize: 13, color: c.inkSoft, marginTop: 2 }}>{message}</T>}
      </View>
    </View>
  );
}

// Request-to-join sheet: one optional intro line. An intro makes the host's
// accept/decline call easier, so we nudge for it without requiring it.
function RequestSheet({ visible, onClose, onSend, hostName }: { visible: boolean; onClose: () => void; onSend: (message: string) => void; hostName: string }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');

  useEffect(() => { if (visible) setMessage(''); }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.scrim }} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ backgroundColor: c.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: insets.bottom + 20 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: c.line, marginBottom: 16 }} />
          <H style={{ fontSize: 20 }}>Request to join</H>
          <T style={{ fontSize: 13, color: c.inkSoft, marginTop: 6, lineHeight: 19 }}>
            {hostName} reviews requests. A quick intro helps them say yes — who you are, why you're keen.
          </T>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={'e.g. "Solo traveler from Spain, love street food!"'}
            placeholderTextColor={c.muted}
            autoFocus
            multiline
            maxLength={140}
            style={{
              marginTop: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 14,
              paddingHorizontal: 14, paddingVertical: 12, minHeight: 74, fontSize: 14.5, color: c.ink,
              fontFamily: 'Jakarta', textAlignVertical: 'top',
            }}
          />
          <Button label="Send request 🙋" onPress={() => onSend(message.trim())} style={{ marginTop: 16 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <T style={{ fontSize: 13, color: c.muted, fontWeight: '700' }}>{label}</T>
      <T style={{ fontSize: 13.5, color: c.ink, fontWeight: '600', flex: 1, textAlign: 'right' }}>{value}</T>
    </View>
  );
}
