// Guard for the handful of actions that genuinely need a server identity:
// publishing a route, joining a buddy meetup, commenting. Browsing, saving and
// planning all work fine as a guest (see lib/auth.tsx), so this is deliberately
// used at only a few call sites.
//
// Without it those actions "succeed" locally while never reaching the server —
// the traveller is told their route was shared, or that they asked to join a
// meetup, and nobody ever sees it.
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './auth';

export function useRequireAuth() {
  const { session, configured, exitGuest } = useAuth();
  const router = useRouter();

  /**
   * Returns true when the action may proceed. Otherwise explains why and offers
   * to sign in, returning false.
   *
   * @param what short phrase completing "Sign in to …", e.g. "share your route"
   */
  return (what: string): boolean => {
    // No backend wired up (local demo build): let everything through rather
    // than blocking on an account that can't exist.
    if (!configured) return true;
    if (session) return true;
    Alert.alert(
      'Sign in to continue',
      `You need an account to ${what}. Everything else — browsing, saving spots and planning your trip — stays free without one.`,
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Sign in', onPress: () => { exitGuest(); router.replace('/auth'); } },
      ],
    );
    return false;
  };
}
