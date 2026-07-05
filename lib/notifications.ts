// Push-notification registration. Requests permission, obtains the Expo push
// token, and saves it to the signed-in user's profile so the backend can
// target them (see supabase/migration-003-push.sql + functions/send-push).
//
// IMPORTANT: remote push tokens are NOT available in Expo Go on SDK 53+ — this
// silently no-ops there and only does real work in a development/production
// build. That's expected; everything is wired so it "just works" once a dev
// build exists, with no further code changes.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { isSupabaseConfigured, supabase } from './supabase';

// Foreground behavior: show a banner even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function isExpoGo() {
  return Constants.appOwnership === 'expo';
}

export async function registerForPushNotifications(): Promise<string | null> {
  // Push tokens require a real device + a dev/standalone build (not Expo Go).
  if (!Device.isDevice || isExpoGo()) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  try {
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    await saveToken(token);
    return token;
  } catch (e) {
    console.warn('getExpoPushTokenAsync failed', e);
    return null;
  }
}

async function saveToken(token: string) {
  if (!isSupabaseConfigured) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from('profiles').update({ push_token: token }).eq('id', user.id);
  if (error) console.warn('save push_token failed', error.message);
}
