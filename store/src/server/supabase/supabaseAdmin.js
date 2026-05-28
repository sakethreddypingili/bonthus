import { createClient } from '@supabase/supabase-js';

console.warn('⚠️ SECURITY WARNING: Service role key should NOT be exposed in frontend code.');
console.warn('TODO: Move all admin operations to a secure backend API endpoint.');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
// ⚠️ CRITICAL SECURITY ISSUE: Service role key in frontend bypasses ALL RLS policies
// This allows anyone with XSS access to modify any database record
// MUST be moved to backend API with proper authentication
const serviceRoleKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Supabase admin credentials missing. Check your .env file for REACT_APP_SUPABASE_SERVICE_ROLE_KEY.');
}

// TODO: SECURITY REFACTOR NEEDED
// Replace all uses of supabaseAdmin with calls to a secure backend API
// Example backend endpoint: POST /api/admin/create-user
// This will allow proper authentication, authorization, and logging
export const supabaseAdmin = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    serviceRoleKey || 'placeholder-key',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    }
);
