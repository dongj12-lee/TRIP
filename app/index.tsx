import { Redirect } from 'expo-router';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';

export default function Index() {
  const { onboarded } = useStore();
  const { configured, session, guest } = useAuth();

  // If Supabase isn't configured yet (no .env), fall back to the local-only
  // demo flow so the app stays usable before the backend is wired up.
  // Guests get straight in: browsing places, guides and the trip planner needs
  // no account, so the app must never open on a sign-up wall.
  if (configured && !session && !guest) return <Redirect href="/auth" />;
  return <Redirect href={onboarded ? '/(tabs)' : '/onboarding'} />;
}
