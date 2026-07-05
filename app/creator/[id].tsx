import React from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/theme';
import { useStore } from '@/lib/store';
import { creatorById } from '@/data';
import { T, H, Screen, DetailHeader, Card, Button } from '@/components/base';
import { Photo } from '@/components/ui';
import { PostTypeBadge } from '@/components/cards';
import { Icon } from '@/components/Icon';

export default function CreatorDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { following, toggleFollow } = useStore();

  const creator = creatorById[id!];
  if (!creator) return <Screen><DetailHeader title="Creator" /></Screen>;
  const isFollowing = following.has(creator.id);

  return (
    <Screen>
      <DetailHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 120 }}>
          <Photo swatch={creator.swatch} height={120} />
        </View>
        <View style={{ paddingHorizontal: 18, marginTop: -34 }}>
          <View style={{ width: 68, height: 68, borderRadius: 999, backgroundColor: c.surface, borderWidth: 3, borderColor: c.paper, alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ fontSize: 34 }}>{creator.avatar}</T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <H style={{ fontSize: 23 }}>{creator.name}</H>
            {creator.verified && <Icon name="check" size={16} stroke={c.accent} sw={2.6} />}
          </View>
          <T style={{ fontSize: 13, color: c.muted, fontWeight: '600' }}>@{creator.handle} · {creator.home}</T>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <View style={{ backgroundColor: c.accent50, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 }}>
              <T style={{ fontSize: 12, fontWeight: '700', color: c.accent }}>{creator.expertise}</T>
            </View>
            <View style={{ backgroundColor: c.surface2, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 }}>
              <T style={{ fontSize: 12, fontWeight: '700', color: c.inkSoft }}>{creator.followers} followers</T>
            </View>
          </View>
          <T style={{ fontSize: 14, lineHeight: 21, color: c.inkSoft, marginTop: 14 }}>{creator.bio}</T>
          <Button
            label={isFollowing ? 'Following' : 'Follow'}
            variant={isFollowing ? 'soft' : 'primary'}
            style={{ marginTop: 16 }}
            onPress={() => toggleFollow(creator.id)}
          />

          <H style={{ fontSize: 18, marginTop: 26, marginBottom: 12 }}>Posts</H>
          <View style={{ gap: 10 }}>
            {creator.posts.map((p, i) => (
              <Card key={i} style={{ padding: 14 }}>
                <PostTypeBadge type={p.type} />
                <T style={{ fontSize: 14.5, fontWeight: '700', marginTop: 8, lineHeight: 19 }}>{p.title}</T>
                <T style={{ fontSize: 12, color: c.muted, marginTop: 6, fontWeight: '600' }}>▲ {p.votes} · 💬 {p.comments} · {p.when}</T>
              </Card>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
