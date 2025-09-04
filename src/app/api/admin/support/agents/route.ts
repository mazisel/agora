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

    // Destek kişilerini getir (JOIN ile kullanıcı ve kategori bilgileri)
    const { data: agents, error } = await supabase
      .from('support_agents')
      .select(`
        id,
        user_id,
        category_id,
        created_at,
        user_profiles!inner(first_name, last_name, email),
        support_categories!inner(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Destek kişileri getirilirken hata:', error);
      return NextResponse.json({ error: 'Destek kişileri getirilemedi' }, { status: 500 });
    }

    // Veriyi düzenle
    const formattedAgents = agents?.map((agent: any) => ({
      id: agent.id,
      user_id: agent.user_id,
      category_id: agent.category_id,
      user_name: `${agent.user_profiles.first_name} ${agent.user_profiles.last_name}`,
      user_email: agent.user_profiles.email,
      category_name: agent.support_categories.name,
      created_at: agent.created_at
    })) || [];

    return NextResponse.json(formattedAgents);
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

    const { user_id, category_id } = await request.json();

    if (!user_id || !category_id) {
      return NextResponse.json({ error: 'Kullanıcı ve kategori seçimi gerekli' }, { status: 400 });
    }

    // Aynı kullanıcı aynı kategoride zaten var mı kontrol et
    const { data: existingAgent, error: checkError } = await supabase
      .from('support_agents')
      .select('id')
      .eq('user_id', user_id)
      .eq('category_id', category_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Mevcut destek kişisi kontrol edilirken hata:', checkError);
      return NextResponse.json({ error: 'Kontrol işlemi başarısız' }, { status: 500 });
    }

    if (existingAgent) {
      return NextResponse.json({ error: 'Bu kullanıcı zaten bu kategoride destek kişisi' }, { status: 400 });
    }

    // Destek kişisi oluştur
    const { data: agent, error } = await supabase
      .from('support_agents')
      .insert([{ user_id, category_id }])
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
      console.error('Destek kişisi oluşturulurken hata:', error);
      return NextResponse.json({ error: 'Destek kişisi oluşturulamadı' }, { status: 500 });
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

    return NextResponse.json(formattedAgent, { status: 201 });
  } catch (error) {
    console.error('API hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
