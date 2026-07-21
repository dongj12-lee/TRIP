import React from 'react';
import { View, Pressable, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme/theme';
import { haptic } from '@/lib/haptics';
import { Icon, IconName } from '@/components/Icon';
import { T } from '@/components/base';

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: 'Explore', icon: 'explore' },
  { name: 'themes', label: 'Themes', icon: 'themes' },
  { name: 'feed', label: 'Feed', icon: 'feed' },
  { name: 'buddy', label: 'Buddy', icon: 'buddy' },
  { name: 'my', label: 'My', icon: 'user' },
];

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

function TabBar({ state, navigation }: TabBarProps) {
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();
  // Native gets a frosted BlurView; web's blur fallback lets content bleed
  // through, so use a solid surface there for a clean edge.
  const Container: any = Platform.OS === 'web' ? View : BlurView;
  const containerProps = Platform.OS === 'web' ? {} : { intensity: 30, tint: dark ? 'dark' : 'light' };
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      <Container
        {...containerProps}
        style={{
          flexDirection: 'row',
          borderTopWidth: 1,
          borderTopColor: c.line,
          backgroundColor: Platform.OS === 'web' ? c.paper : dark ? 'rgba(26,22,17,0.92)' : 'rgba(251,246,238,0.94)',
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
        }}
      >
        {state.routes.map((route, index) => {
          const meta = TABS.find((t) => t.name === route.name);
          if (!meta) return null;
          const focused = state.index === index;
          return (
            <Pressable
              key={route.key}
              onPress={() => {
                haptic.tick();
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 }}
            >
              <Icon
                name={meta.icon}
                size={24}
                stroke={focused ? c.accent : c.muted}
                fill={focused && meta.icon === 'user' ? c.accent : 'none'}
                sw={focused ? 2.1 : 1.8}
              />
              <T style={{ fontSize: 10.5, fontWeight: focused ? '700' : '600', color: focused ? c.accent : c.muted }}>
                {meta.label}
              </T>
            </Pressable>
          );
        })}
      </Container>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...(props as unknown as TabBarProps)} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="themes" />
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="buddy" />
      <Tabs.Screen name="my" />
    </Tabs>
  );
}
