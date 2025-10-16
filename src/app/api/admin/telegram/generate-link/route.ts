import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME;

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  let authToken: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    authToken = authHeader.substring(7);
  } else {
    const cookieStore = await cookies();
    const candidates = [
      'sb-access-token',
      'sb-riacmnpxjsbrppzfjeur-auth-token',
      'supabase-auth-token',
      'supabase.auth.token',
    ];

    for (const name of candidates) {
      const cookie = cookieStore.get(name);
      if (!cookie?.value) continue;

      try {
        const parsed = JSON.parse(cookie.value);
        if (parsed.access_token) {
          authToken = parsed.access_token;
          break;
        }
      } catch {
        authToken = cookie.value;
        break;
      }

      authToken = cookie.value;
      break;
    }
  }

  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authToken);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('authority_level')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || !['admin', 'manager', 'director'].includes(profile.authority_level)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { userId: user.id };
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId query param is required' }, { status: 400 });
  }

  const { data: tokens, error } = await supabaseAdmin
    .from('telegram_link_tokens')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Telegram link token fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tokens });
}

export async function POST(request: NextRequest) {
  if (!TELEGRAM_BOT_USERNAME) {
    return NextResponse.json(
      { error: 'TELEGRAM_BOT_USERNAME environment variable is not configured.' },
      { status: 500 }
    );
  }

  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { userId, expireInMinutes = 1440 } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const expiresAt =
      typeof expireInMinutes === 'number' && expireInMinutes > 0
        ? new Date(Date.now() + expireInMinutes * 60 * 1000)
        : null;

    await supabaseAdmin
      .from('telegram_link_tokens')
      .update({
        expires_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .is('consumed_at', null);

    const token = crypto.randomBytes(16).toString('hex');

    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('telegram_link_tokens')
      .insert([
        {
          user_id: userId,
          token,
          expires_at: expiresAt ? expiresAt.toISOString() : null,
        },
      ])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const deepLink = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${token}`;

    return NextResponse.json({
      success: true,
      token: insertData.token,
      deepLink,
      expiresAt: insertData.expires_at,
    });
  } catch (error) {
    console.error('Telegram link generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
