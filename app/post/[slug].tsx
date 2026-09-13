import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, TextInput, KeyboardAvoidingView, Platform, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useRequireAuth } from '@/lib/requireAuth';
import { useRemoteContent } from '@/lib/remoteData';
import { isSupabaseConfigured } from '@/lib/supabase';
import { addComment, fetchPostComments, toggleCommentLike, updateComment, deleteComment, updatePost, deletePost, friendlyError } from '@/data/remote';
import { useToast } from '@/components/Toast';
import { Comment } from '@/data/types';
import { T, H, Screen, DetailHeader, Button } from '@/components/base';
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
  const { sharedPost, profile, adoptRoute } = useStore();
  const { session } = useAuth();
  const requireAuth = useRequireAuth();
  const { posts, placeBySlug, refreshPosts } = useRemoteContent();
  const { showToast } = useToast();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  // Editing the post itself (author only), mirroring the comment editor above.
  // `postEdited` is the optimistic override shown until refreshPosts() lands.
  const [editingPost, setEditingPost] = useState(false);
  const [postDraft, setPostDraft] = useState({ title: '', body: '' });
  const [postEdited, setPostEdited] = useState<{ title: string; body: string } | null>(null);

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

  if (!post) {
    return (
      <Screen>
        <DetailHeader title="Post" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 80 }}>
          <T style={{ fontSize: 34 }}>🧭</T>
          <H style={{ fontSize: 19, marginTop: 10, textAlign: 'center' }}>We couldn't find that post</H>
          <T style={{ fontSize: 13.5, color: c.muted, textAlign: 'center', marginTop: 6, lineHeight: 19 }}>
            It may have been removed, or the link is out of date.
          </T>
          <Button label="Back to the feed" style={{ marginTop: 18 }} onPress={() => router.replace('/(tabs)/feed')} />
        </View>
      </Screen>
    );
  }
  const place = post.placeSlug ? placeBySlug[post.placeSlug] : null;
  const leadWithBody = !post.title; // untitled posts read body-first
  const canWrite = !!post.id && isSupabaseConfigured && !!session;

  // The author refines their own route (with the feedback below in view); anyone
  // else can adopt it into their own planner. Either way it loads back into the
  // editable itinerary — the back half of the plan → share → feedback → edit loop.
  const isAuthor =
    (!!post.authorId && !!session?.user?.id && post.authorId === session.user.id) ||
    (!!sharedPost && sharedPost.slug === post.slug);
  // Deliberately NOT `isAuthor` above: that one also counts a locally-shared
  // post (sharedPost), which isn't proof this account wrote it. Editing and
  // deleting must key off the real author_id, matching the RLS policies
  // ("edit own posts" / "delete own posts") that back them.
  const isPostMine =
    !!post.id && !!post.authorId && !!session?.user?.id && post.authorId === session.user.id;
  const shownTitle = postEdited ? postEdited.title : post.title;
  const shownBody = postEdited ? postEdited.body : post.body;

  const startEditPost = () => {
    haptic.tick();
    setPostDraft({ title: shownTitle ?? '', body: shownBody ?? '' });
    setEditingPost(true);
  };

  const saveEditPost = async () => {
    if (!post.id || !postDraft.body.trim()) return;
    const next = { title: postDraft.title.trim(), body: postDraft.body.trim() };
    const prev = postEdited;
    setPostEdited(next);
    setEditingPost(false);
    try {
      await updatePost(post.id, next);
      refreshPosts();
    } catch (e) {
      showToast(friendlyError(e, "Couldn't save your edit, try again."));
      setPostEdited(prev);
    }
  };

  const removePost = () => {
    if (!post.id) return;
    haptic.tick();
    Alert.alert('Delete post?', "This can't be undone. Comments on this post will be removed too.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(post.id!);
            showToast('Post deleted');
            refreshPosts();
            router.replace('/(tabs)/feed');
          } catch (e) {
            showToast(friendlyError(e, "Couldn't delete your post, try again."));
          }
        },
      },
    ]);
  };

  const useThisRoute = () => {
    haptic.success();
    adoptRoute(post);
    showToast(isAuthor ? 'Loaded into your planner' : 'Route added to your planner', '🗺️');
    router.push('/planner');
  };

  const startReply = (cm: Comment) => {
    if (isSupabaseConfigured && !requireAuth('reply to a comment')) return;
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
      showToast(friendlyError(e, "Couldn't post your comment, try again."));
    } finally {
      setPosting(false);
    }
  };

  const likeComment = (cm: Comment) => {
    if (!cm.id || !post.id) return;
    if (isSupabaseConfigured && !requireAuth('like a comment')) return;
    haptic.tick();
    const willLike = !cm.likedByMe;
    setComments((prev) => prev.map((x) => (x.id === cm.id ? { ...x, likedByMe: willLike, likeCount: Math.max(0, (x.likeCount ?? 0) + (willLike ? 1 : -1)) } : x)));
    toggleCommentLike(cm.id, willLike).catch(() => {});
  };

  const startEditComment = (cm: Comment) => {
    if (!cm.id) return;
    haptic.tick();
    setReplyTo(null);
    setEditingId(cm.id);
    setEditDraft(cm.body);
  };

  const cancelEditComment = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const saveEditComment = async (cm: Comment) => {
    if (!cm.id || !editDraft.trim()) return;
    const body = editDraft.trim();
    setComments((prev) => prev.map((x) => (x.id === cm.id ? { ...x, body } : x)));
    setEditingId(null);
    setEditDraft('');
    try {
      await updateComment(cm.id, body);
    } catch (e) {
      showToast(friendlyError(e, "Couldn't save your edit, try again."));
      setComments((prev) => prev.map((x) => (x.id === cm.id ? { ...x, body: cm.body } : x)));
    }
  };

  const removeComment = (cm: Comment) => {
    if (!cm.id) return;
    haptic.tick();
    const hasReplies = comments.some((x) => x.parentId === cm.id);
    Alert.alert(
      'Delete comment?',
      hasReplies
        ? "This can't be undone. Replies to this comment will no longer be visible."
        : "This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const id = cm.id!;
            const prevComments = comments;
            setComments((prev) => prev.filter((x) => x.id !== id));
            deleteComment(id).catch(() => {
              showToast("Couldn't delete your comment, try again.");
              setComments(prevComments);
            });
          },
        },
      ],
    );
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
          {editingPost ? (
            <View style={{ marginTop: 16 }}>
              <TextInput
                value={postDraft.title}
                onChangeText={(t) => setPostDraft((d) => ({ ...d, title: t }))}
                placeholder="Title (optional)"
                placeholderTextColor={c.muted}
                style={{ fontSize: 17, fontWeight: '700', color: c.ink, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 10, padding: 10, fontFamily: 'Pretendard' }}
              />
              <TextInput
                value={postDraft.body}
                onChangeText={(t) => setPostDraft((d) => ({ ...d, body: t }))}
                multiline
                autoFocus
                style={{ fontSize: 15, color: c.ink, lineHeight: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 10, padding: 10, marginTop: 8, minHeight: 110, textAlignVertical: 'top', fontFamily: 'Pretendard' }}
              />
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                <Pressable onPress={() => setEditingPost(false)} hitSlop={8}>
                  <T style={{ fontSize: 13, fontWeight: '700', color: c.muted }}>Cancel</T>
                </Pressable>
                <Pressable onPress={saveEditPost} hitSlop={8} disabled={!postDraft.body.trim()}>
                  <T style={{ fontSize: 13, fontWeight: '700', color: postDraft.body.trim() ? c.accent : c.muted }}>Save</T>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              {!leadWithBody && !!shownTitle && <H style={{ fontSize: 23, lineHeight: 29, marginTop: 16 }}>{shownTitle}</H>}
              {!!shownBody && <T style={{ fontSize: 16, lineHeight: 25, color: c.ink, marginTop: leadWithBody ? 14 : 10 }}>{shownBody}</T>}
              {!!post.imageUrl && <Photo uri={post.imageUrl} height={240} radius={14} style={{ marginTop: 14 }} />}
              {/* Author's own controls, same inline treatment as a comment's. */}
              {isPostMine && (
                <View style={{ flexDirection: 'row', gap: 18, marginTop: 12 }}>
                  <Pressable onPress={startEditPost} hitSlop={8}>
                    <T style={{ fontSize: 13, fontWeight: '700', color: c.muted }}>Edit</T>
                  </Pressable>
                  <Pressable onPress={removePost} hitSlop={8}>
                    <T style={{ fontSize: 13, fontWeight: '700', color: c.rose }}>Delete</T>
                  </Pressable>
                </View>
              )}
            </>
          )}

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
                      <T style={{ fontSize: 11.5, fontWeight: '800', color: c.paper }}>{d.day}</T>
                    </View>
                    <T style={{ fontSize: 14, fontWeight: '700' }}>{d.theme}</T>
                  </View>
                  {(() => {
                    // Stops in shared posts may carry only a slug, resolve coords for the map.
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

          {post.type === 'route' && post.routeDays && post.routeDays.length > 0 && (
            <Pressable
              onPress={useThisRoute}
              accessibilityRole="button"
              accessibilityLabel={isAuthor ? 'Refine this route in the planner' : 'Use this route in your planner'}
              style={({ pressed }) => ({
                marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                paddingVertical: 14, borderRadius: 14, backgroundColor: c.accent, opacity: pressed ? 0.92 : 1,
              })}
            >
              <Icon name={isAuthor ? 'edit' : 'plus'} size={18} stroke={c.paper} sw={2.2} />
              <T style={{ fontSize: 15, fontWeight: '800', color: c.paper }}>
                {isAuthor ? 'Refine in planner' : 'Use this route'}
              </T>
            </Pressable>
          )}
          {isAuthor && post.type === 'route' && (
            <T style={{ fontSize: 12, color: c.muted, textAlign: 'center', marginTop: 8, lineHeight: 17 }}>
              Read the feedback below, then refine, reorder or trim in the planner.
            </T>
          )}

          {post.type === 'route' && <RouteFeedbackBar postId={post.id} initialCounts={post.feedbackCounts} />}

          {/* Comments */}
          <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 18 }}>
            <T style={{ fontSize: 14, fontWeight: '800', marginBottom: 14 }}>
              {comments.length > 0 ? `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}` : 'Comments'}
            </T>
            {threads.length === 0 && (
              <T style={{ fontSize: 13.5, color: c.muted, marginBottom: 8 }}>No replies yet, start the conversation.</T>
            )}
            <View style={{ gap: 16 }}>
              {threads.map(({ comment, replies }) => (
                <View key={comment.id}>
                  <CommentRow
                    cm={comment}
                    isMine={!!comment.authorId && comment.authorId === session?.user?.id}
                    editing={editingId === comment.id}
                    editValue={editDraft}
                    onChangeEdit={setEditDraft}
                    onLike={() => likeComment(comment)}
                    onReply={() => startReply(comment)}
                    onStartEdit={() => startEditComment(comment)}
                    onSaveEdit={() => saveEditComment(comment)}
                    onCancelEdit={cancelEditComment}
                    onDelete={() => removeComment(comment)}
                  />
                  {replies.length > 0 && (
                    <View style={{ marginLeft: 40, marginTop: 12, gap: 12, borderLeftWidth: 1.5, borderLeftColor: c.line, paddingLeft: 12 }}>
                      {replies.map((r) => (
                        <CommentRow
                          key={r.id}
                          cm={r}
                          small
                          isMine={!!r.authorId && r.authorId === session?.user?.id}
                          editing={editingId === r.id}
                          editValue={editDraft}
                          onChangeEdit={setEditDraft}
                          onLike={() => likeComment(r)}
                          onReply={() => startReply(comment)}
                          onStartEdit={() => startEditComment(r)}
                          onSaveEdit={() => saveEditComment(r)}
                          onCancelEdit={cancelEditComment}
                          onDelete={() => removeComment(r)}
                        />
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Sticky composer. Signed out (but with a real backend) used to just
            hide this whole row with nothing in its place — the section above
            still says "Comments" and invites you to "start the conversation"
            with no way to. isSupabaseConfigured alone (the local-demo case,
            no backend at all) still hides it: there's nowhere for a comment
            to go. */}
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
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={replyTo ? 'Post reply' : 'Post comment'}
                style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: draft.trim() ? c.accent : c.surface2, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="arrow" size={19} stroke={draft.trim() ? c.paper : c.muted} sw={2.4} />
              </Pressable>
            </View>
          </View>
        )}
        {!canWrite && isSupabaseConfigured && !!post.id && (
          <Pressable
            onPress={() => requireAuth('comment')}
            style={{ borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.surface, paddingVertical: 14, paddingBottom: (insets.bottom || 10) + 4, alignItems: 'center' }}
          >
            <T style={{ fontSize: 13.5, fontWeight: '700', color: c.accent }}>Sign in to comment</T>
          </Pressable>
        )}
      </KeyboardAvoidingView>

      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} target={{ type: 'post', id: post.id ?? post.slug, authorId: post.authorId }} />
    </Screen>
  );
}

function CommentRow({
  cm, small, isMine, editing, editValue, onChangeEdit, onLike, onReply, onStartEdit, onSaveEdit, onCancelEdit, onDelete,
}: {
  cm: Comment;
  small?: boolean;
  isMine?: boolean;
  editing?: boolean;
  editValue?: string;
  onChangeEdit?: (v: string) => void;
  onLike: () => void;
  onReply: () => void;
  onStartEdit?: () => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  onDelete?: () => void;
}) {
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
        {editing ? (
          <View style={{ marginTop: 6 }}>
            <TextInput
              value={editValue}
              onChangeText={onChangeEdit}
              multiline
              autoFocus
              style={{ fontSize: 14, color: c.ink, lineHeight: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 10, padding: 10, fontFamily: 'Pretendard' }}
            />
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
              <Pressable onPress={onCancelEdit} hitSlop={8}>
                <T style={{ fontSize: 12, fontWeight: '700', color: c.muted }}>Cancel</T>
              </Pressable>
              <Pressable onPress={onSaveEdit} hitSlop={8} disabled={!editValue?.trim()}>
                <T style={{ fontSize: 12, fontWeight: '700', color: editValue?.trim() ? c.accent : c.muted }}>Save</T>
              </Pressable>
            </View>
          </View>
        ) : (
          <T style={{ fontSize: 14, color: c.ink, marginTop: 3, lineHeight: 20 }}>{cm.body}</T>
        )}
        {/* No more disabled-but-still-rendered heart: liking and replying
            while signed out now route through useRequireAuth (likeComment /
            startReply above) and prompt to sign in, instead of silently
            doing nothing behind a `disabled` prop with no visual change. */}
        {!editing && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 6 }}>
            <Pressable onPress={onLike} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon name="heart" size={14} fill={cm.likedByMe ? c.rose : 'none'} stroke={cm.likedByMe ? c.rose : c.muted} sw={2} />
              {(cm.likeCount ?? 0) > 0 && <T style={{ fontSize: 12, fontWeight: '700', color: cm.likedByMe ? c.rose700 : c.muted }}>{cm.likeCount}</T>}
            </Pressable>
            <Pressable onPress={onReply} hitSlop={8}>
              <T style={{ fontSize: 12, fontWeight: '700', color: c.muted }}>Reply</T>
            </Pressable>
            {isMine && (
              <>
                <Pressable onPress={onStartEdit} hitSlop={8}>
                  <T style={{ fontSize: 12, fontWeight: '700', color: c.muted }}>Edit</T>
                </Pressable>
                <Pressable onPress={onDelete} hitSlop={8}>
                  <T style={{ fontSize: 12, fontWeight: '700', color: c.rose }}>Delete</T>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
