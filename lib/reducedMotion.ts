import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Tracks the OS "Reduce Motion" accessibility setting (iOS: Settings →
// Accessibility → Motion; Android: Remove animations). Components use it to
// swap large slides / confetti / looping pulses for a crossfade or a static
// state — motion that vestibular-sensitive users have asked the system to
// suppress. Returns false on web, where there's no such native signal.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}
