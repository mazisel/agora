import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateUser, isAdmin, checkSupportAgent } from '@/lib/auth-helper';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // Kullanıcı doğrulama
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user!;
    const url = new URL(request.url);
    const type = url.searchParams.get('type');

    let tickets;
    let error;

    if (type === 'assigned') {
      // Kullanıcının destek kişisi olarak atandığı talepleri getir
      const agentCheck = await checkSupportAgent(user.id);
      
      if (!agentCheck.isAgent || agentCheck.categories.length === 0) {
        return NextResponse.json([]);
      }

      const result = await supabase
        .from('support_tickets')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          created_at,
          updated_at,
          resolved_at,
          requester_id,
          support_categories!inner(name),
          assigned_to_profile:user_profiles!support_tickets_assigned_to_fkey(first_name, last_name, email),
          requester_profile:user_profiles!support_tickets_requester_id_fkey(first_name, last_name, email)
        `)
        .in('category_id', agentCheck.categories)
        .order('created_at', { ascending: false });

      tickets = result.data;
      error = result.error;
    } else {
      // Admin ise tüm talepleri, support agent ise yetkili kategorilerdeki talepleri, normal kullanıcı sadece kendi taleplerini görebilir
      const userIsAdmin = await isAdmin(user.id);
      
      if (userIsAdmin) {
        const result = await supabase
          .from('support_tickets')
          .select(`
            id,
            title,
            description,
            status,
            priority,
            created_at,
            updated_at,
            resolved_at,
            support_categories!inner(name),
            assigned_to_profile:user_profiles!support_tickets_assigned_to_fkey(first_name, last_name, email),
            requester_profile:user_profiles!support_tickets_requester_id_fkey(first_name, last_name, email)
          `)
          .order('created_at', { ascending: false });

        tickets = result.data;
        error = result.error;
      } else {
        // Support agent ise yetkili kategorilerdeki talepleri + kendi taleplerini görebilir
        const agentCheck = await checkSupportAgent(user.id);
        
        if (agentCheck.isAgent && agentCheck.categories.length > 0) {
          const result = await supabase
            .from('support_tickets')
            .select(`
              id,
              title,
              description,
              status,
              priority,
              created_at,
              updated_at,
              resolved_at,
              support_categories!inner(name),
              assigned_to_profile:user_profiles!support_tickets_assigned_to_fkey(first_name, last_name, email),
              requester_profile:user_profiles!support_tickets_requester_id_fkey(first_name, last_name, email)
            `)
            .or(`category_id.in.(${agentCheck.categories.join(',')}),requester_id.eq.${user.id}`)
            .order('created_at', { ascending: false });

          tickets = result.data;
          error = result.error;
        } else {
          // Normal kullanıcı sadece kendi taleplerini görebilir
          const result = await supabase
            .from('support_tickets')
            .select(`
              id,
              title,
              description,
              status,
              priority,
              created_at,
              updated_at,
              resolved_at,
              support_categories!inner(name),
              assigned_to_profile:user_profiles!support_tickets_assigned_to_fkey(first_name, last_name, email)
            `)
            .eq('requester_id', user.id)
            .order('created_at', { ascending: false });

          tickets = result.data;
          error = result.error;
        }
      }
    }

    if (error) {
      console.error('Destek talepleri getirilirken hata:', error);
      return NextResponse.json({ error: 'Destek talepleri getirilemedi' }, { status: 500 });
    }

    // Veriyi düzenle
    const formattedTickets = tickets?.map((ticket: any) => ({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category_name: ticket.support_categories.name,
      assigned_to_name: ticket.assigned_to_profile ? 
        `${ticket.assigned_to_profile.first_name} ${ticket.assigned_to_profile.last_name}` : null,
      assigned_to_email: ticket.assigned_to_profile?.email || null,
      requester_name: ticket.requester_profile ? 
        `${ticket.requester_profile.first_name} ${ticket.requester_profile.last_name}` : null,
      requester_email: ticket.requester_profile?.email || null,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      resolved_at: ticket.resolved_at
    })) || [];

    return NextResponse.json(formattedTickets);
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
    const { title, description, category_id, priority = 'medium' } = await request.json();

    if (!title || !description || !category_id) {
      return NextResponse.json({ 
        error: 'Başlık, açıklama ve kategori gerekli' 
      }, { status: 400 });
    }

    // Kategori varlığını kontrol et
    const { data: categoryCheck, error: categoryError } = await supabase
      .from('support_categories')
      .select('is_system')
      .eq('id', category_id)
      .single();

    if (categoryError) {
      console.error('Kategori kontrolü hatası:', categoryError);
      return NextResponse.json({ error: 'Geçersiz kategori' }, { status: 400 });
    }

    // Bu kategoriye atanmış destek kişisini bul
    const { data: agents, error: agentsError } = await supabase
      .from('support_agents')
      .select('user_id')
      .eq('category_id', category_id);

    if (agentsError) {
      console.error('Destek kişileri getirilirken hata:', agentsError);
      return NextResponse.json({ error: 'Destek kişileri getirilemedi' }, { status: 500 });
    }

    // Rastgele bir destek kişisi seç (eğer varsa)
    let assigned_to = null;
    if (agents && agents.length > 0) {
      const randomIndex = Math.floor(Math.random() * agents.length);
      assigned_to = agents[randomIndex].user_id;
    }

    // Destek talebini oluştur
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert([{
        title,
        description,
        category_id,
        requester_id: user.id,
        assigned_to,
        priority,
        status: 'open'
      }])
      .select(`
        id,
        title,
        description,
        status,
        priority,
        created_at,
        support_categories!inner(name),
        assigned_to_profile:user_profiles!support_tickets_assigned_to_fkey(first_name, last_name, email)
      `)
      .single();

    if (error) {
      console.error('Destek talebi oluşturulurken hata:', error);
      return NextResponse.json({ error: 'Destek talebi oluşturulamadı' }, { status: 500 });
    }

    // Eğer atama yapıldıysa, görev oluştur
    if (assigned_to) {
      const taskTitle = `Destek Talebi: ${title}`;
      const taskDescription = `Yeni destek talebi oluşturuldu.\n\nKategori: ${(ticket as any).support_categories.name}\nAçıklama: ${description}\n\nDestek Talebi ID: ${(ticket as any).id}`;

      // Görev oluştur (Admin client kullan - RLS bypass için)
      const { error: taskError } = await supabaseAdmin
        .from('tasks')
        .insert([{
          title: taskTitle,
          description: taskDescription,
          assigned_to,
          assigned_by: null, // System tarafından atandı
          created_by: user.id, // Talebi oluşturan kullanıcı
          status: 'todo',
          priority: priority,
          project_id: null // Destek talepleri için proje yok
        }]);

      if (taskError) {
        console.error('Görev oluşturulurken hata:', taskError);
        // Görev oluşturulamazsa da devam et, destek talebi oluşturuldu
      }
    }

    // Veriyi düzenle
    const formattedTicket = {
      id: (ticket as any).id,
      title: (ticket as any).title,
      description: (ticket as any).description,
      status: (ticket as any).status,
      priority: (ticket as any).priority,
      category_name: (ticket as any).support_categories.name,
      assigned_to_name: (ticket as any).assigned_to_profile ? 
        `${(ticket as any).assigned_to_profile.first_name} ${(ticket as any).assigned_to_profile.last_name}` : null,
      assigned_to_email: (ticket as any).assigned_to_profile?.email || null,
      created_at: (ticket as any).created_at
    };

    return NextResponse.json(formattedTicket, { status: 201 });
  } catch (error) {
    console.error('API hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
