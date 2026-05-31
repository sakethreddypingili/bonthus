import { supabase } from '../server/supabase/supabase';

export const PROFILE_CACHE_KEY = 'lenscare_profile_cache_v1';

/** Remove Supabase session tokens and app profile cache from browser storage. */
export function clearAuthStorage() {
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
    sessionStorage.removeItem(PROFILE_CACHE_KEY);

    const strip = (storage) => {
      const keys = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase.auth'))) {
          keys.push(key);
        }
      }
      keys.forEach((k) => storage.removeItem(k));
    };

    strip(localStorage);
    strip(sessionStorage);
  } catch {
    // Private mode / blocked storage
  }
}

/** Sign out locally (always clears session storage even if the network call fails). */
export async function logout() {
  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      console.warn('Sign out:', error.message);
    }
  } catch (err) {
    console.warn('Sign out:', err?.message || err);
  } finally {
    clearAuthStorage();
  }
}
