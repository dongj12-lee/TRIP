import React, { useEffect, useState } from 'react';
import { View, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useRemoteContent } from '@/lib/remoteData';
import { isSupabaseConfigured } from '@/lib/supabase';
import { createPost, friendlyError } from '@/data/remote';
import { PostType } from '@/data/types';
import { T, H } from './base';
import { Avatar } from './Avatar';
import { PhotoAttach } from './PhotoAttach';
import { Icon } from './Icon';
import { useToast } from './Toast';
import { GlassView } from 'expo-glass-effect';
import { GLASS_ON } from './glass';
import { haptic } from '@/lib/haptics';

// A frictionless, body-first composer, the fastest way to share something.
// No forced title, no forced category: just type and post. It's a plain post by
// default; flip to Question only if you're actually asking the community.
const TYPES: { key: PostType; label: string }[] = [
  { key: 'post', label: 'Post' },
  { key: 'question', label: 'Question' },
];

export function QuickComposeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useStore();
  const { session } = useAuth();
  const { addLocalPost } = useRemoteContent();
  const { showToast } = useToast();

  const [type, setType] = useState<PostType>('post');
  const [body, setBody] = useState('');
  const [title, setTitle] = useState('');
  const [showTitle, setShowTitle] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setType('post'); setBody(''); setTitle(''); setShowTitle(false); setImageUrl(undefined); setBusy(false);
    }
  }, [visible]);

  const canPost = (body.trim().length > 0 || !!imageUrl) && !busy;
  const canWrite = isSupabaseConfigured && !!session;

  const post = async () => {
    if (!canPost) return;
    if (!canWrite) { showToast('Sign in to post', '🔒'); return; }
    setBusy(true);
    try {
      const created = await createPost({
        type,
        title: title.trim(),
        body: body.trim(),
        imageUrl,
        authorName: profile.displayName || 'You',
        authorCountry: profile.country,
      });
      addLocalPost(created);
      haptic.success();
      showToast('Shared to the community', '🎉');
      onClose();
    } catch (e) {
      showToast(friendlyError(e, 'Could not post, try again'), '⚠️');
    } finally {
      setBusy(false);
    }
  };

  const name = profile.displayName || 'You';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.scrim }} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ backgroundColor: GLASS_ON ? 'transparent' : c.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: insets.bottom + 12, overflow: 'hidden' }}>
          {GLASS_ON && <GlassView glassEffectStyle="regular" pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />}
          {/* Top bar: cancel · avatar+name · Post */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
            <Pressable onPress={onClose} hitSlop={8}>
              <T style={{ fontSize: 15, color: c.muted, fontWeight: '600' }}>Cancel</T>
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Avatar name={name} uri={profile.avatarUrl} size={26} />
              <T style={{ fontSize: 14, fontWeight: '700', color: c.ink }}>{name}</T>
            </View>
            <Pressable
              onPress={post}
              disabled={!canPost}
              style={{ backgroundColor: canPost ? c.accent : c.surface2, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 999 }}
            >
              <T style={{ fontSize: 14, fontWeight: '800', color: canPost ? c.paper : c.muted }}>{busy ? '…' : 'Post'}</T>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 320 }} contentContainerStyle={{ paddingHorizontal: 18 }}>
            {/* Was a footer chip, competing for space with Post/Question/
                Route/Photo in a horizontally scrolling row narrow enough
                that it could end up scrolled out of view with no visible
                edge to hint it was still there. A plain link right above the
                fields it controls doesn't have that problem — always fully
                on-screen, no scrolling involved. */}
            {showTitle ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Add a title (optional)"
                  placeholderTextColor={c.muted}
                  autoFocus
                  style={{ flex: 1, fontSize: 17, fontWeight: '700', color: c.ink, fontFamily: 'Pretendard-Bold', paddingVertical: 8 }}
                  maxLength={100}
                />
                <Pressable
                  onPress={() => { haptic.tick(); setShowTitle(false); setTitle(''); }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Remove title"
                >
                  <Icon name="close" size={16} stroke={c.muted} sw={2.2} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => { haptic.tick(); setShowTitle(true); }}
                style={{ alignSelf: 'flex-start', paddingVertical: 8 }}
              >
                <T style={{ fontSize: 13, fontWeight: '700', color: c.muted }}>+ Add a title</T>
              </Pressable>
            )}
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Share a thought, tip, or question…"
              placeholderTextColor={c.muted}
              autoFocus
              multiline
              style={{ fontSize: 16.5, lineHeight: 24, color: c.ink, fontFamily: 'Pretendard', paddingTop: 6, paddingBottom: 12, minHeight: imageUrl ? 60 : 120, textAlignVertical: 'top' }}
            />
            {!!imageUrl && (
              <View style={{ paddingBottom: 12 }}>
                <PhotoAttach value={imageUrl} onChange={setImageUrl} canUpload={canWrite} />
              </View>
            )}
          </ScrollView>

          {/* Footer: just Post/Question/Route (the segmented-control look of
              the Feed tab's All/Posts/Routes/Questions filter, text-only —
              no icons, matching that reference exactly) and Photo. Title
              moved above, next to the fields it actually controls; with it
              gone this whole row comfortably fits without needing to scroll,
              so there's no more "off the edge, out of reach" risk for
              anything here — the bug Photo itself used to have when it lived
              in a horizontally-scrolling row. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line }}>
            {/* flex:1 on the track and on each segment — same as the Feed
                filter it's copying — so the three share the row evenly
                instead of sitting at their own text width with the rest of
                the row left as dead space next to Photo. */}
            <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.surface2, borderRadius: 999, padding: 3 }}>
              {TYPES.map((t) => {
                const on = type === t.key;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => { haptic.tick(); setType(t.key); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={{
                      flex: 1, alignItems: 'center',
                      paddingVertical: 6, borderRadius: 999,
                      backgroundColor: on ? c.surface : 'transparent',
                      ...(on ? { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : null),
                    }}
                  >
                    <T style={{ fontSize: 12.5, fontWeight: '700', color: on ? c.ink : c.muted }}>{t.label}</T>
                  </Pressable>
                );
              })}
              {/* Route posts aren't written here — they need real day-by-day
                  stops, which this free-text composer has no picker for. The
                  Routes tab and feed cards show them right alongside Post/
                  Question, so without this a traveller who wants to share
                  one has no clue this box can't do it and no idea where to
                  go instead. Tapping it hands off to the trip planner's own
                  "Share for feedback" (lib/store.tsx shareTrip), the actual
                  place Route posts come from. */}
              <Pressable
                onPress={() => { haptic.tick(); onClose(); router.push('/trip'); }}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 999 }}
              >
                <T style={{ fontSize: 12.5, fontWeight: '700', color: c.muted }}>Route</T>
              </Pressable>
            </View>
            {!imageUrl && <PhotoAttach value={imageUrl} onChange={setImageUrl} canUpload={canWrite} compact />}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
