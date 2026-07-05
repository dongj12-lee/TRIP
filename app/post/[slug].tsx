import React, { useEffect, useState } from 'react';
import { View, ScrollView, TextInput, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useRemoteContent } from '@/lib/remoteData';
import { isSupabaseConfigured } from '@/lib/supabase';
import { addComment, fetchPostComments } from '@/data/remote';
import { Comment } from '@/data/types';
import { T, H, Screen, DetailHeader, Button } from '@/components/base';
import { Flag } from '@/components/ui';
import { PostTypeBadge, PlaceCard } from '@/components/cards';
import { ReportSheet } from '@/components/ReportSheet';

export default function PostDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { sharedPost, profile } = useStore();
  const { session } = useAuth();
  const { posts, placeBySlug } = useRemoteContent();

  const [liveComments, setLiveComments] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const post = sharedPost && sharedPost.slug === slug ? sharedPost : posts.find((p) => p.slug === slug);

  useEffect(() => {
    if (!post?.id || !isSupabaseConfigured) return;
    fetchPostComments(post.id).then(setLiveComments).catch(() => {});
  }, [post?.id]);

  if (!post) return <Screen><DetailHeader title="Post" /></Screen>;
  const place = post.placeSlug ? placeBySlug[post.placeSlug] : null;
  const commentList = liveComments ?? post.commentList;

  const submitComment = async () => {
    if (!draft.trim() || !post.id) return;
    setPosting(true);
    try {
      await addComment(post.id, draft.trim(), 'You', profile.country);
      const fresh = await fetchPostComments(post.id);
      setLiveComments(fresh);
      setDraft('');
    } catch (e) {
      console.warn('addComment failed', e);
    } finally {
      setPosting(false);
    }
  };

  return (
    <Screen>
      <DetailHeader
        title="Post"
        right={
          <Pressable onPress={() => setReportOpen(true)} hitSlop={10} style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
            <T style={{ fontSize: 20, color: c.muted, fontWeight: '800' }}>···</T>
          </Pressable>
        }
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 30 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row' }}>
            <PostTypeBadge type={post.type} />
          </View>
          <H style={{ fontSize: 25, lineHeight: 30, marginTop: 12 }}>{post.title}</H>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <Flag country={post.author.country} size={26} />
            <T style={{ fontSize: 13.5, fontWeight: '700' }}>{post.author.name}</T>
            <T style={{ fontSize: 12.5, color: c.muted }}>· {post.when}</T>
          </View>
          <T style={{ fontSize: 15, lineHeight: 24, color: c.ink, marginTop: 16 }}>{post.body}</T>

          {place && (
            <View style={{ marginTop: 18 }}>
              <T style={{ fontSize: 12, fontWeight: '800', color: c.muted, letterSpacing: 0.8, marginBottom: 10 }}>MENTIONED PLACE</T>
              <PlaceCard place={place} compact />
            </View>
          )}

          {post.routeDays && (
            <View style={{ marginTop: 20 }}>
              {post.routeDays.map((d, di) => (
                <View key={di} style={{ marginBottom: 18 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <View style={{ backgroundColor: c.accent, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999 }}>
                      <T style={{ fontSize: 11.5, fontWeight: '800', color: '#fff' }}>{d.day}</T>
                    </View>
                    <T style={{ fontSize: 14, fontWeight: '700' }}>{d.theme}</T>
                  </View>
                  <View style={{ borderLeftWidth: 2, borderLeftColor: c.line, marginLeft: 10, paddingLeft: 16, gap: 12 }}>
                    {d.stops.map((s, si) => {
                      const name = s.slug && placeBySlug[s.slug] ? placeBySlug[s.slug].name : s.name;
                      return (
                        <View key={si}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {!!s.time && <T style={{ fontSize: 12, fontWeight: '800', color: c.accent }}>{s.time}</T>}
                            <T style={{ fontSize: 14.5, fontWeight: '700', flex: 1 }}>{name}</T>
                          </View>
                          {!!s.note && <T style={{ fontSize: 13, color: c.inkSoft, marginTop: 2, lineHeight: 18 }}>{s.note}</T>}
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Comments */}
          <View style={{ marginTop: 12 }}>
            <T style={{ fontSize: 14, fontWeight: '800', marginBottom: 12 }}>💬 {commentList.length} comments</T>
            <View style={{ gap: 14 }}>
              {commentList.map((cm, i) => (
                <View key={cm.id ?? i} style={{ flexDirection: 'row', gap: 10 }}>
                  <Flag country={cm.country} size={30} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <T style={{ fontSize: 13, fontWeight: '700' }}>{cm.name}</T>
                      <T style={{ fontSize: 11.5, color: c.muted }}>· {cm.when}</T>
                    </View>
                    <T style={{ fontSize: 13.5, color: c.ink, marginTop: 3, lineHeight: 19 }}>{cm.body}</T>
                  </View>
                </View>
              ))}
            </View>

            {post.id && isSupabaseConfigured && session && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Add a comment…"
                  placeholderTextColor={c.muted}
                  style={{ flex: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, fontSize: 14, color: c.ink, fontFamily: 'Jakarta' }}
                  multiline
                />
                <Button label={posting ? '…' : 'Post'} disabled={!draft.trim() || posting} onPress={submitComment} style={{ width: 84, height: 44 }} />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} target={{ type: 'post', id: post.id ?? post.slug, authorId: post.authorId }} />
    </Screen>
  );
}
