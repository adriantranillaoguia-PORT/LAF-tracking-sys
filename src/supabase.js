import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Copy .env.example to .env and add your project credentials.'
  );
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
const authStorageKey = `sb-${projectRef}-auth-token`;
const persistencePreferenceKey = 'cpsu-auth-persistence';

function getAuthStorage() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(persistencePreferenceKey) === 'session'
    ? window.sessionStorage
    : window.localStorage;
}

const authStorage = {
  getItem(key) {
    return getAuthStorage()?.getItem(key) ?? null;
  },
  setItem(key, value) {
    getAuthStorage()?.setItem(key, value);
  },
  removeItem(key) {
    getAuthStorage()?.removeItem(key);
  },
};

export function setAuthPersistence(remember) {
  if (remember) {
    window.sessionStorage.removeItem(authStorageKey);
    window.sessionStorage.setItem(persistencePreferenceKey, 'local');
    return;
  }

  window.localStorage.removeItem(authStorageKey);
  window.sessionStorage.setItem(persistencePreferenceKey, 'session');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: authStorage },
});

export const adminSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storageKey: 'admin-login' },
});