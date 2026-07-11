import React, { useEffect, useState } from 'react';
import { View, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useToast } from './Toast';
import { haptic } from '@/lib/haptics';

// A frictionless, body-first composer — the fastest way to share a thought.
// No forced title, no forced category: type a thought and post. Title and the
// tip/question distinction are optional, revealed only if you want them.
const TYPES: { key: PostType; emoji: string; label: string }[] = [
  { key: 'thought', emoji: '💭', label: 'Thought' },
  { key: 'tip', emoji: '💡', label: 'Tip' },
  { key: 'question', emoji: '❓', label: 'Question' },
];

export function QuickComposeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useStore();
  const { session } = useAuth();
  const { addLocalPost } = useRemoteContent();
  const { showToast } = useToast();

  const [type, setType] = useState<PostType>('thought');
  const [body, setBody] = useState('');
  const [title, setTitle] = useState('');
  const [showTitle, setShowTitle] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setType('thought'); setBody(''); setTitle(''); setShowTitle(false); setImageUrl(undefined); setBusy(false);
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
      showToast(friendlyError(e, 'Could not post — try again'), '⚠️');
    } finally {
      setBusy(false);
    }
  };

  const name = profile.displayName || 'You';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.scrim }} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ backgroundColor: c.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingBottom: insets.bottom + 12 }}>
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
              <T style={{ fontSize: 14, fontWeight: '800', color: canPost ? '#fff' : c.muted }}>{busy ? '…' : 'Post'}</T>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 320 }} contentContainerStyle={{ paddingHorizontal: 18 }}>
            {showTitle && (
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Add a title (optional)"
                placeholderTextColor={c.muted}
                style={{ fontSize: 17, fontWeight: '700', color: c.ink, fontFamily: 'Jakarta-Bold', paddingVertical: 8 }}
                maxLength={100}
              />
            )}
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Share a thought, tip, or question…"
              placeholderTextColor={c.muted}
              autoFocus
              multiline
              style={{ fontSize: 16.5, lineHeight: 24, color: c.ink, fontFamily: 'Jakarta', paddingTop: 6, paddingBottom: 12, minHeight: imageUrl ? 60 : 120, textAlignVertical: 'top' }}
            />
            {!!imageUrl && (
              <View style={{ paddingBottom: 12 }}>
                <PhotoAttach value={imageUrl} onChange={setImageUrl} canUpload={canWrite} />
              </View>
            )}
          </ScrollView>

          {/* Footer: type pills + add-title toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.line }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'center', paddingVertical: 10 }} style={{ flex: 1 }}>
              {TYPES.map((t) => {
                const on = type === t.key;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => { haptic.tick(); setType(t.key); }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, backgroundColor: on ? c.accent50 : c.surface, borderWidth: 1, borderColor: on ? c.accent : c.line }}
                  >
                    <T style={{ fontSize: 13 }}>{t.emoji}</T>
                    <T style={{ fontSize: 12.5, fontWeight: '700', color: on ? c.accent : c.inkSoft }}>{t.label}</T>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => { haptic.tick(); setShowTitle((v) => !v); }}
                style={{ paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, backgroundColor: showTitle ? c.accent50 : c.surface, borderWidth: 1, borderColor: showTitle ? c.accent : c.line }}
              >
                <T style={{ fontSize: 12.5, fontWeight: '700', color: showTitle ? c.accent : c.inkSoft }}>{showTitle ? '– Title' : '+ Title'}</T>
              </Pressable>
              {!imageUrl && <PhotoAttach value={imageUrl} onChange={setImageUrl} canUpload={canWrite} compact />}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
