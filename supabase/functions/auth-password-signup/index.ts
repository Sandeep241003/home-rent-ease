const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !publishableKey) {
      return new Response(JSON.stringify({ message: 'Backend auth config missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, password, emailRedirectTo } = (await req.json()) as {
      email?: string;
      password?: string;
      emailRedirectTo?: string;
    };

    if (!email || !password) {
      return new Response(JSON.stringify({ message: 'Email and password are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: Record<string, unknown> = {
      email,
      password,
      gotrue_meta_security: {},
    };

    if (emailRedirectTo) {
      body.data = {};
      body.code_challenge = undefined;
      body.code_challenge_method = undefined;
    }

    const headers: Record<string, string> = {
      apikey: publishableKey,
      authorization: `Bearer ${publishableKey}`,
      'content-type': 'application/json;charset=UTF-8',
      'x-supabase-api-version': '2024-01-01',
    };

    // Build the signup URL with redirect
    let signupUrl = `${supabaseUrl}/auth/v1/signup`;
    if (emailRedirectTo) {
      // GoTrue expects redirect_to as a query param or in the body
      // We pass it in the body as GoTrue accepts it there too
      body.redirect_to = emailRedirectTo;
    }

    const authResponse = await fetch(signupUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const rawBody = await authResponse.text();
    let payload: Record<string, unknown> = {};

    if (rawBody) {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        payload = {};
      }
    }

    if (!authResponse.ok) {
      return new Response(
        JSON.stringify({
          message:
            typeof payload.msg === 'string'
              ? payload.msg
              : typeof payload.message === 'string'
              ? payload.message
              : typeof payload.error_description === 'string'
              ? payload.error_description
              : 'Signup failed',
          code: typeof payload.code === 'string' ? payload.code : 'signup_error',
        }),
        {
          status: authResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // For email confirmation flow, GoTrue returns the user but no session tokens
    // For auto-confirm, it returns access_token + refresh_token
    return new Response(
      JSON.stringify({
        access_token: typeof payload.access_token === 'string' ? payload.access_token : null,
        refresh_token: typeof payload.refresh_token === 'string' ? payload.refresh_token : null,
        user: payload.user ?? payload,
        confirmation_sent: !payload.access_token, // true when email confirm is required
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[auth-password-signup] unexpected error', error);
    return new Response(JSON.stringify({ message: 'Unexpected backend auth error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
