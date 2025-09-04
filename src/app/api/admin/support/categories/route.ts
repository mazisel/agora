import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateUser, isAdmin } from '@/lib/auth-helper';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: NextRequest) {
  try {
    // Kullanıcı doğrulama
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user!;
    
    // Admin yetkisi kontrolü
    const userIsAdmin = await isAdmin(user.id);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Kategorileri getir
    const { data: categories, error } = await supabase
      .from('support_categories')
      .select('*')
      .order('is_system', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Kategoriler getirilirken hata:', error);
      return NextResponse.json({ error: 'Kategoriler getirilemedi' }, { status: 500 });
    }

    return NextResponse.json(categories);
  } catch (error) {
    console.error('API hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Kullanıcı doğrulama
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user!;
    
    // Admin yetkisi kontrolü
    const userIsAdmin = await isAdmin(user.id);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, description } = await request.json();

    if (!name || !description) {
      return NextResponse.json({ error: 'Kategori adı ve açıklama gerekli' }, { status: 400 });
    }

    // Kategori oluştur
    const { data: category, error } = await supabase
      .from('support_categories')
      .insert([{ name, description }])
      .select()
      .single();

    if (error) {
      console.error('Kategori oluşturulurken hata:', error);
      return NextResponse.json({ error: 'Kategori oluşturulamadı' }, { status: 500 });
    }

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('API hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
