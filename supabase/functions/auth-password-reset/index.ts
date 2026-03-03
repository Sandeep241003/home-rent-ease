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

    const { email, redirectTo } = (await req.json()) as {
      email?: string;
      redirectTo?: string;
    };

    if (!email) {
      return new Response(JSON.stringify({ message: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: Record<string, unknown> = { email };
    if (redirectTo) {
      body.redirect_to = redirectTo;
    }

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        authorization: `Bearer ${publishableKey}`,
        'content-type': 'application/json;charset=UTF-8',
        'x-supabase-api-version': '2024-01-01',
      },
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
              : 'Password reset failed',
          code: typeof payload.code === 'string' ? payload.code : 'reset_error',
        }),
        {
          status: authResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[auth-password-reset] unexpected error', error);
    return new Response(JSON.stringify({ message: 'Unexpected backend auth error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
