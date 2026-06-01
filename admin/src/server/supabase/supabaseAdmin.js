import { createClient } from '@supabase/supabase-js';

// ⚠️ SECURITY WARNING: Service role key should NOT be exposed in frontend code.
// This allows bypassing all Row Level Security (RLS) policies.
// TODO: Move all admin operations to a secure backend API endpoint.

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const serviceRoleKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    // We only log this in development to avoid leaking info in production
    if (process.env.NODE_ENV === 'development') {
        console.warn('Supabase admin credentials missing for advanced operations.');
    }
}

export const supabaseAdmin = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    serviceRoleKey || 'placeholder-key',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
            // Use a separate storage key so this client never conflicts
            // with the user-session GoTrueClient in supabase.js.
            storageKey: 'sb-admin-service-role'
        }
    }
);
