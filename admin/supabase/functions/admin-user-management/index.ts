import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Initialize Supabase Service Role Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 2. Validate Requester Authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the user from the JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized user session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify if requester is admin/super_admin from public.users table
    const { data: requesterProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !requesterProfile || !['admin', 'super_admin'].includes(requesterProfile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden: Insufficient privileges' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Process the action
    const { action, email, password, role, operation_type, store_id, lab_id, userId, name, phone, current_address, permanent_address } = await req.json()

    if (action === 'create') {
      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'Email and password are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role, operation_type, name }
      })

      if (authError) throw authError

      // Insert into public.users table
      const { error: dbError } = await supabaseAdmin
        .from('users')
        .insert([{
          id: authData.user.id,
          email,
          name: name || email.split('@')[0],
          password_hash: 'managed_by_auth',
          role: role || 'sales',
          operation_type: operation_type || 'store',
          store_id: store_id || null,
          lab_id: lab_id || null,
          phone: phone || null,
          current_address: current_address || null,
          permanent_address: permanent_address || null,
          is_active: true
        }])

      if (dbError) {
        // Rollback auth creation if DB insertion fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        throw dbError
      }

      return new Response(JSON.stringify({ message: 'User created successfully', user: authData.user }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'delete') {
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required for deletion' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Delete auth user
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (authError) throw authError

      // Delete from public.users table
      const { error: dbError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', userId)

      if (dbError) throw dbError

      return new Response(JSON.stringify({ message: 'User deleted successfully' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
