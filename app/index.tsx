import { Redirect } from 'expo-router';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';

export default function Index() {
  const { onboarded } = useStore();
  const { configured, session } = useAuth();

  // If Supabase isn't configured yet (no .env), fall back to the local-only
  // demo flow so the app stays usable before the backend is wired up.
  if (configured && !session) return <Redirect href="/auth" />;
  return <Redirect href={onboarded ? '/(tabs)' : '/onboarding'} />;
}
