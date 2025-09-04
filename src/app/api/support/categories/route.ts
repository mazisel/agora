import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateUser, isAdmin, checkSupportAgent } from '@/lib/auth-helper';

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
    const userIsAdmin = await isAdmin(user.id);

    // Admin ise tüm kategorileri göster
    if (userIsAdmin) {
      const { data: categories, error } = await supabase
        .from('support_categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Kategoriler getirilirken hata:', error);
        return NextResponse.json({ error: 'Kategoriler getirilemedi' }, { status: 500 });
      }

      return NextResponse.json(categories);
    }

    // Normal kullanıcı için: Sadece yetkili olduğu kategoriler
    const agentCheck = await checkSupportAgent(user.id);
    
    let categories;
    let error;

    if (agentCheck.isAgent && agentCheck.categories.length > 0) {
      // Sadece kullanıcının yetkili olduğu kategoriler
      const result = await supabase
        .from('support_categories')
        .select('*')
        .in('id', agentCheck.categories)
        .order('name', { ascending: true });

      categories = result.data;
      error = result.error;
    } else {
      // Yetkili olmayan kullanıcılar hiçbir kategori göremez
      categories = [];
      error = null;
    }

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
