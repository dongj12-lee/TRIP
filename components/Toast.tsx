import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, View, Text, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';

// App-wide toast: brief bottom confirmation for actions that otherwise happen
// silently (save, follow, publish, share…). One toast at a time; auto-dismisses.
type ToastState = { message: string; emoji?: string } | null;
type ToastContextValue = { showToast: (message: string, emoji?: string) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, emoji?: string) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, emoji });
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(
          ({ finished }) => finished && setToast(null),
        );
      }, 2200);
    },
    [anim],
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 92, alignItems: 'center' }}>
          <Animated.View
            style={{
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              maxWidth: '88%',
              backgroundColor: dark ? '#f3ebde' : '#2e2a24',
              paddingVertical: 11,
              paddingHorizontal: 16,
              borderRadius: 999,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.22,
              shadowRadius: 14,
              elevation: 6,
            }}
          >
            {toast.emoji ? <Text style={{ fontSize: 15 }}>{toast.emoji}</Text> : null}
            <Text style={{ color: dark ? '#2e2a24' : '#fffdfa', fontSize: 14, fontWeight: '700', fontFamily: 'Jakarta-Bold' }} numberOfLines={2}>
              {toast.message}
            </Text>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  // Safe no-op if used outside a provider (keeps call sites simple).
  return ctx ?? { showToast: () => {} };
}
