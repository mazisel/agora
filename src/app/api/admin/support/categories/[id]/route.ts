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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { name, description } = await request.json();

    if (!name || !description) {
      return NextResponse.json({ error: 'Kategori adı ve açıklama gerekli' }, { status: 400 });
    }

    // Önce kategorinin sistem kategorisi olup olmadığını kontrol et
    const { data: existingCategory, error: checkError } = await supabase
      .from('support_categories')
      .select('is_system')
      .eq('id', id)
      .single();

    if (checkError) {
      console.error('Kategori kontrol edilirken hata:', checkError);
      return NextResponse.json({ error: 'Kategori bulunamadı' }, { status: 404 });
    }

    if (existingCategory?.is_system) {
      return NextResponse.json({ error: 'Sistem kategorileri düzenlenemez' }, { status: 403 });
    }

    // Kategoriyi güncelle
    const { data: category, error } = await supabase
      .from('support_categories')
      .update({ name, description })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Kategori güncellenirken hata:', error);
      return NextResponse.json({ error: 'Kategori güncellenemedi' }, { status: 500 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('API hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Önce kategorinin sistem kategorisi olup olmadığını kontrol et
    const { data: existingCategory, error: checkError } = await supabase
      .from('support_categories')
      .select('is_system')
      .eq('id', id)
      .single();

    if (checkError) {
      console.error('Kategori kontrol edilirken hata:', checkError);
      return NextResponse.json({ error: 'Kategori bulunamadı' }, { status: 404 });
    }

    if (existingCategory?.is_system) {
      return NextResponse.json({ error: 'Sistem kategorileri silinemez' }, { status: 403 });
    }

    // Önce bu kategoriye bağlı destek kişilerini kontrol et
    const { data: agents, error: agentsError } = await supabase
      .from('support_agents')
      .select('id')
      .eq('category_id', id);

    if (agentsError) {
      console.error('Destek kişileri kontrol edilirken hata:', agentsError);
      return NextResponse.json({ error: 'Kategori kontrol edilemedi' }, { status: 500 });
    }

    if (agents && agents.length > 0) {
      return NextResponse.json({
        error: 'Bu kategoriye bağlı destek kişileri var. Önce onları silin.'
      }, { status: 400 });
    }

    // Kategoriyi sil
    const { error } = await supabase
      .from('support_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Kategori silinirken hata:', error);
      return NextResponse.json({ error: 'Kategori silinemedi' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
