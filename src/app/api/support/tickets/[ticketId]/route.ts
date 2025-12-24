import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Supabase clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
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

    const { status } = await request.json();
    const { ticketId } = await params;

    if (!status) {
      return NextResponse.json({
        error: 'Status gerekli'
      }, { status: 400 });
    }

    // Destek talebini güncelle
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    // Eğer resolved oluyorsa resolved_at ekle
    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId)
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
      .single();

    if (error) {
      console.error('Destek talebi güncellenirken hata:', error);
      return NextResponse.json({ error: 'Destek talebi güncellenemedi' }, { status: 500 });
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
      created_at: (ticket as any).created_at,
      updated_at: (ticket as any).updated_at,
      resolved_at: (ticket as any).resolved_at
    };

    return NextResponse.json(formattedTicket);
  } catch (error) {
    console.error('API hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
