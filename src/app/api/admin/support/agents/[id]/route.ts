import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Supabase clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { user_id, category_id } = await request.json();

    if (!user_id || !category_id) {
      return NextResponse.json({ error: 'Kullanıcı ve kategori seçimi gerekli' }, { status: 400 });
    }

    // Aynı kullanıcı aynı kategoride zaten var mı kontrol et (kendisi hariç)
    const { data: existingAgent, error: checkError } = await supabase
      .from('support_agents')
      .select('id')
      .eq('user_id', user_id)
      .eq('category_id', category_id)
      .neq('id', params.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Mevcut destek kişisi kontrol edilirken hata:', checkError);
      return NextResponse.json({ error: 'Kontrol işlemi başarısız' }, { status: 500 });
    }

    if (existingAgent) {
      return NextResponse.json({ error: 'Bu kullanıcı zaten bu kategoride destek kişisi' }, { status: 400 });
    }

    // Destek kişisini güncelle
    const { data: agent, error } = await supabase
      .from('support_agents')
      .update({ user_id, category_id })
      .eq('id', params.id)
      .select(`
        id,
        user_id,
        category_id,
        created_at,
        user_profiles!inner(first_name, last_name, email),
        support_categories!inner(name)
      `)
      .single();

    if (error) {
      console.error('Destek kişisi güncellenirken hata:', error);
      return NextResponse.json({ error: 'Destek kişisi güncellenemedi' }, { status: 500 });
    }

    // Veriyi düzenle
    const formattedAgent = {
      id: (agent as any).id,
      user_id: (agent as any).user_id,
      category_id: (agent as any).category_id,
      user_name: `${(agent as any).user_profiles.first_name} ${(agent as any).user_profiles.last_name}`,
      user_email: (agent as any).user_profiles.email,
      category_name: (agent as any).support_categories.name,
      created_at: (agent as any).created_at
    };

    return NextResponse.json(formattedAgent);
  } catch (error) {
    console.error('API hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Destek kişisini sil
    const { error } = await supabase
      .from('support_agents')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Destek kişisi silinirken hata:', error);
      return NextResponse.json({ error: 'Destek kişisi silinemedi' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
