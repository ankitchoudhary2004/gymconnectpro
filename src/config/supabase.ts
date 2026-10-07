// ============================================
// GymTrack Pro - Supabase Configuration
// ============================================
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Supabase project credentials (reads from .env via Expo or fallback)
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

// Custom storage adapter using SecureStore (native) and localStorage (web) for token persistence
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      } catch {
        return null;
      }
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
      } catch (err) {
        console.warn('localStorage setItem failed for key:', key, err);
      }
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      console.warn('SecureStore setItem failed for key:', key);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch (err) {
        console.warn('localStorage removeItem failed for key:', key, err);
      }
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      console.warn('SecureStore removeItem failed for key:', key);
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
