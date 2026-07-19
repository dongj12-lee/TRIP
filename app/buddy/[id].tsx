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
import { T, H, Screen, DetailHeader, Button } from '@/components/base';
import { Avatar } from '@/components/Avatar';
import { Photo } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { LinearGradient } from 'expo-linear-gradient';
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
        {/* Event cover — the place photo when it's a specific spot, else a warm
            banner — with the emoji + activity set over it, party-invite style. */}
        <View style={{ borderRadius: 22, overflow: 'hidden', marginTop: 4 }}>
          {place?.photoUrl ? (
            <Photo uri={place.photoUrl} swatch={place.swatch} height={178} />
          ) : (
            <LinearGradient colors={[c.accent, '#a2502f']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 150 }} />
          )}
          <LinearGradient colors={['rgba(20,14,10,0.04)', 'rgba(20,14,10,0.82)']} locations={[0.35, 1]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          {isFull && (
            <View style={{ position: 'absolute', top: 14, right: 14, backgroundColor: 'rgba(255,255,255,0.94)', paddingVertical: 4, paddingHorizontal: 11, borderRadius: 999 }}>
              <T style={{ fontSize: 11.5, fontWeight: '800', color: c.rose700 }}>Full</T>
            </View>
          )}
          <View style={{ position: 'absolute', left: 18, right: 18, bottom: 16 }}>
            <T style={{ fontSize: 32, marginBottom: 4 }}>{buddy.emoji}</T>
            <H style={{ fontSize: 25, lineHeight: 29, color: '#fff' }} numberOfLines={3}>{buddy.activity}</H>
          </View>
        </View>

        {/* When / Where */}
        <View style={{ marginTop: 18, gap: 13 }}>
          <InfoLine icon="clock" text={buddy.when} />
          <InfoLine icon="pin" text={place ? `${place.name} · ${buddy.neighborhood}` : buddy.neighborhood} />
        </View>

        {/* Host */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 }}>
          <Avatar name={buddy.author.name} size={38} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <T style={{ fontSize: 14.5, fontWeight: '800' }} numberOfLines={1}>{buddy.author.name}</T>
            <T style={{ fontSize: 13 }}>{buddy.author.country}</T>
            <View style={{ backgroundColor: c.accent50, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 }}>
              <T style={{ fontSize: 10.5, fontWeight: '800', color: c.accent }}>Host</T>
            </View>
          </View>
        </View>

        {!!buddy.note && <T style={{ fontSize: 14.5, lineHeight: 22, color: c.ink, marginTop: 16 }}>{buddy.note}</T>}

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

        {/* Who's going — faces first, with the open spots shown (Partiful-style) */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 26, marginBottom: 14 }}>
          <T style={{ fontSize: 16, fontWeight: '800' }}>Who's going</T>
          <T style={{ fontSize: 13, color: c.muted, fontWeight: '700' }}>{accepted.length + 1}/{buddy.groupSize}</T>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, rowGap: 18 }}>
          <GoingAvatar name={buddy.author.name} country={buddy.author.country} host />
          {accepted.map((p) => (
            <GoingAvatar key={p.userId ?? p.name} name={p.name} country={p.country} />
          ))}
          {Array.from({ length: Math.max(0, buddy.groupSize - 1 - accepted.length) }).map((_, i) => (
            <OpenSlot key={`open-${i}`} />
          ))}
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

function InfoLine({ icon, text }: { icon: string; text: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
      <View style={{ width: 34, height: 34, borderRadius: 999, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon as any} size={17} stroke={c.inkSoft} sw={2} />
      </View>
      <T style={{ flex: 1, fontSize: 14.5, color: c.ink, fontWeight: '600' }}>{text}</T>
    </View>
  );
}

// A single attendee, face first — Partiful's "who's going" grid.
function GoingAvatar({ name, country, host }: { name: string; country: string; host?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', width: 60 }}>
      <View>
        <Avatar name={name} size={52} />
        {host && (
          <View style={{ position: 'absolute', bottom: -4, alignSelf: 'center', backgroundColor: c.accent, paddingVertical: 1.5, paddingHorizontal: 7, borderRadius: 999, borderWidth: 2, borderColor: c.paper }}>
            <T style={{ fontSize: 8.5, fontWeight: '800', color: '#fff' }}>Host</T>
          </View>
        )}
      </View>
      <T style={{ fontSize: 11.5, fontWeight: '700', color: c.ink, marginTop: 8 }} numberOfLines={1}>{name.split(' ')[0]}</T>
      <T style={{ fontSize: 11 }}>{country}</T>
    </View>
  );
}

// An unfilled spot — shows the group still has room, invite-page style.
function OpenSlot() {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', width: 60 }}>
      <View style={{ width: 52, height: 52, borderRadius: 999, borderWidth: 1.5, borderColor: c.line, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="plus" size={19} stroke={c.muted} sw={2} />
      </View>
      <T style={{ fontSize: 11, color: c.muted, marginTop: 8 }}>Open</T>
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
        <View style={{ backgroundColor: c.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: insets.bottom + 20 }}>
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
              fontFamily: 'Pretendard', textAlignVertical: 'top',
            }}
          />
          <Button label="Send request 🙋" onPress={() => onSend(message.trim())} style={{ marginTop: 16 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

