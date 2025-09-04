import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Supabase clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // Auth token'ı al
    const authHeader = request.headers.get('authorization');
    let authToken = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      authToken = authHeader.substring(7);
    } else {
      // Cookie'den almayı dene
      const cookieStore = await cookies();
      
      const possibleCookieNames = [
        'sb-access-token',
        'sb-riacmnpxjsbrppzfjeur-auth-token',
        'supabase-auth-token',
        'supabase.auth.token'
      ];

      for (const cookieName of possibleCookieNames) {
        const cookie = cookieStore.get(cookieName);
        if (cookie?.value) {
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
        }
      }
    }

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Kullanıcı doğrulama
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authToken);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin yetkisi kontrolü
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select('authority_level')
      .eq('id', user.id)
      .single();

    if (userError || userData?.authority_level !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Kullanıcıları getir
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, email, authority_level')
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Kullanıcılar getirilirken hata:', error);
      return NextResponse.json({ error: 'Kullanıcılar getirilemedi' }, { status: 500 });
    }

    return NextResponse.json(users);
  } catch (error) {
    console.error('API hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
