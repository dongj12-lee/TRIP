import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, TextInput, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useRemoteContent } from '@/lib/remoteData';
import { isSupabaseConfigured } from '@/lib/supabase';
import { addComment, fetchPostComments, toggleCommentLike, friendlyError } from '@/data/remote';
import { useToast } from '@/components/Toast';
import { Comment } from '@/data/types';
import { T, H, Screen, DetailHeader } from '@/components/base';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { PostTypeBadge, PlaceCard } from '@/components/cards';
import { Photo } from '@/components/ui';
import { ReportSheet } from '@/components/ReportSheet';
import { RouteFeedbackBar } from '@/components/RouteFeedbackBar';
import { RouteMap } from '@/components/RouteMap';
import { haptic } from '@/lib/haptics';

export default function PostDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { sharedPost, profile } = useStore();
  const { session } = useAuth();
  const { posts, placeBySlug } = useRemoteContent();
  const { showToast } = useToast();
  const inputRef = useRef<TextInput>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const post = sharedPost && sharedPost.slug === slug ? sharedPost : posts.find((p) => p.slug === slug);

  useEffect(() => {
    if (!post?.id || !isSupabaseConfigured) { setComments(post?.commentList ?? []); return; }
    fetchPostComments(post.id).then(setComments).catch(() => {});
  }, [post?.id]);

  // Group into one level of threads: top-level comments, each with its replies.
  const threads = useMemo(() => {
    const tops = comments.filter((cm) => !cm.parentId);
    const byParent = new Map<string, Comment[]>();
    for (const cm of comments) {
      if (cm.parentId) {
        const arr = byParent.get(cm.parentId) ?? [];
        arr.push(cm);
        byParent.set(cm.parentId, arr);
      }
    }
    return tops.map((cm) => ({ comment: cm, replies: cm.id ? byParent.get(cm.id) ?? [] : [] }));
  }, [comments]);

  if (!post) return <Screen><DetailHeader title="Post" /></Screen>;
  const place = post.placeSlug ? placeBySlug[post.placeSlug] : null;
  const leadWithBody = !post.title; // untitled posts read body-first
  const canWrite = !!post.id && isSupabaseConfigured && !!session;

  const startReply = (cm: Comment) => {
    haptic.tick();
    setReplyTo(cm);
    inputRef.current?.focus();
  };

  const submit = async () => {
    if (!draft.trim() || !post.id) return;
    setPosting(true);
    try {
      const created = await addComment(post.id, draft.trim(), profile.displayName || 'You', profile.country, replyTo?.id ?? null);
      setComments((prev) => [...prev, created]);
      setDraft('');
      setReplyTo(null);
      haptic.success();
    } catch (e) {
      console.warn('addComment failed', e);
      showToast(friendlyError(e, "Couldn't post your comment — try again."));
    } finally {
      setPosting(false);
    }
  };

  const likeComment = (cm: Comment) => {
    if (!cm.id || !canWrite) return;
    haptic.tick();
    const willLike = !cm.likedByMe;
    setComments((prev) => prev.map((x) => (x.id === cm.id ? { ...x, likedByMe: willLike, likeCount: Math.max(0, (x.likeCount ?? 0) + (willLike ? 1 : -1)) } : x)));
    toggleCommentLike(cm.id, willLike).catch(() => {});
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
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Author */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 4 }}>
            <Avatar name={post.author.name} size={44} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <T style={{ fontSize: 15, fontWeight: '800' }}>{post.author.name}</T>
                <T style={{ fontSize: 14 }}>{post.author.country}</T>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
                <T style={{ fontSize: 12.5, color: c.muted }}>{post.when}</T>
                <PostTypeBadge type={post.type} />{/* self-hides for plain posts */}
              </View>
            </View>
          </View>

          {/* Content */}
          {!leadWithBody && <H style={{ fontSize: 23, lineHeight: 29, marginTop: 16 }}>{post.title}</H>}
          {!!post.body && <T style={{ fontSize: 16, lineHeight: 25, color: c.ink, marginTop: leadWithBody ? 14 : 10 }}>{post.body}</T>}
          {!!post.imageUrl && <Photo uri={post.imageUrl} height={240} radius={14} style={{ marginTop: 14 }} />}

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
                  {(() => {
                    // Stops in shared posts may carry only a slug — resolve coords for the map.
                    const mapStops = d.stops.map((s) => {
                      const p = s.slug ? placeBySlug[s.slug] : null;
                      return { name: s.name ?? p?.name ?? '', lat: p?.lat, lng: p?.lng };
                    });
                    return mapStops.filter((s) => s.lat != null).length >= 2 ? (
                      <View style={{ borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: c.line, marginBottom: 12 }}>
                        <RouteMap stops={mapStops} height={130} />
                      </View>
                    ) : null;
                  })()}
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

          {post.type === 'route' && <RouteFeedbackBar postId={post.id} initialCounts={post.feedbackCounts} />}

          {/* Comments */}
          <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 18 }}>
            <T style={{ fontSize: 14, fontWeight: '800', marginBottom: 14 }}>
              {comments.length > 0 ? `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}` : 'Comments'}
            </T>
            {threads.length === 0 && (
              <T style={{ fontSize: 13.5, color: c.muted, marginBottom: 8 }}>No replies yet — start the conversation.</T>
            )}
            <View style={{ gap: 16 }}>
              {threads.map(({ comment, replies }) => (
                <View key={comment.id}>
                  <CommentRow cm={comment} onLike={() => likeComment(comment)} onReply={() => startReply(comment)} canInteract={canWrite} />
                  {replies.length > 0 && (
                    <View style={{ marginLeft: 40, marginTop: 12, gap: 12, borderLeftWidth: 1.5, borderLeftColor: c.line, paddingLeft: 12 }}>
                      {replies.map((r) => (
                        <CommentRow key={r.id} cm={r} small onLike={() => likeComment(r)} onReply={() => startReply(comment)} canInteract={canWrite} />
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Sticky composer */}
        {canWrite && (
          <View style={{ borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.paper, paddingBottom: insets.bottom || 10 }}>
            {replyTo && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 }}>
                <T style={{ fontSize: 12.5, color: c.muted }}>Replying to <T style={{ fontWeight: '700', color: c.inkSoft }}>{replyTo.name}</T></T>
                <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
                  <Icon name="close" size={15} stroke={c.muted} sw={2.2} />
                </Pressable>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 14, paddingVertical: 10 }}>
              <Avatar name={profile.displayName || 'You'} uri={profile.avatarUrl} size={32} />
              <TextInput
                ref={inputRef}
                value={draft}
                onChangeText={setDraft}
                placeholder={replyTo ? `Reply to ${replyTo.name}…` : 'Add a comment…'}
                placeholderTextColor={c.muted}
                style={{ flex: 1, maxHeight: 110, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 18, paddingHorizontal: 14, paddingTop: 9, paddingBottom: 9, fontSize: 14.5, color: c.ink, fontFamily: 'Pretendard' }}
                multiline
              />
              <Pressable
                onPress={submit}
                disabled={!draft.trim() || posting}
                style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: draft.trim() ? c.accent : c.surface2, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="arrow" size={19} stroke={draft.trim() ? '#fff' : c.muted} sw={2.4} />
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} target={{ type: 'post', id: post.id ?? post.slug, authorId: post.authorId }} />
    </Screen>
  );
}

function CommentRow({
  cm, small, onLike, onReply, canInteract,
}: { cm: Comment; small?: boolean; onLike: () => void; onReply: () => void; canInteract: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Avatar name={cm.name} size={small ? 28 : 34} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <T style={{ fontSize: 13, fontWeight: '800' }}>{cm.name}</T>
          <T style={{ fontSize: 12 }}>{cm.country}</T>
          <T style={{ fontSize: 11.5, color: c.muted }}>· {cm.when}</T>
        </View>
        <T style={{ fontSize: 14, color: c.ink, marginTop: 3, lineHeight: 20 }}>{cm.body}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 6 }}>
          <Pressable onPress={onLike} hitSlop={8} disabled={!canInteract} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Icon name="heart" size={14} fill={cm.likedByMe ? c.rose : 'none'} stroke={cm.likedByMe ? c.rose : c.muted} sw={2} />
            {(cm.likeCount ?? 0) > 0 && <T style={{ fontSize: 12, fontWeight: '700', color: cm.likedByMe ? c.rose700 : c.muted }}>{cm.likeCount}</T>}
          </Pressable>
          {canInteract && (
            <Pressable onPress={onReply} hitSlop={8}>
              <T style={{ fontSize: 12, fontWeight: '700', color: c.muted }}>Reply</T>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
