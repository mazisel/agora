import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type'); // 'all' for admins, default for user's own

    if (type === 'all') {
      // Adminler ve kategori yetkililer için - tüm avans taleplerini getir
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('authority_level')
        .eq('id', user.id)
        .single();

      // Admin, manager, team_lead, director yetkisi varsa genel yetki ver
      const hasGeneralAuthority = userProfile && [
        'admin', 
        'manager', 
        'team_lead', 
        'director'
      ].includes(userProfile.authority_level);

      // Avans kategorisinde support agent mi kontrol et
      let hasAdvanceCategory = false;
      if (!hasGeneralAuthority) {
        const { data: supportAgents, error: agentError } = await supabase
          .from('support_agents')
          .select(`
            category_id,
            support_categories!inner(name)
          `)
          .eq('user_id', user.id);

        if (!agentError && supportAgents) {
          hasAdvanceCategory = supportAgents.some((agent: any) => 
            agent.support_categories.name === 'Avans Talebi'
          );
        }
      }

      if (!hasGeneralAuthority && !hasAdvanceCategory) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      // Tüm avans taleplerini getir
      const { data: advanceRequests, error } = await supabase
        .from('advance_requests')
        .select(`
          *,
          user_profiles!advance_requests_user_profiles_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all advance requests:', error);
        return NextResponse.json({ error: 'Failed to fetch advance requests' }, { status: 500 });
      }

      return NextResponse.json(advanceRequests || []);
    } else {
      // Kullanıcının user_profiles ID'sini bul
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (profileError || !userProfile) {
        console.error('Error fetching user profile:', profileError);
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
      }

      // Kullanıcının kendi avans taleplerini getir
      const { data: advanceRequests, error } = await supabase
        .from('advance_requests')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching advance requests:', error);
        return NextResponse.json({ error: 'Failed to fetch advance requests' }, { status: 500 });
      }

      return NextResponse.json(advanceRequests || []);
    }

  } catch (error: any) {
    console.error('Advance requests API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, currency, reason, repayment_plan, installment_count } = body;

    // Validasyon
    if (!amount || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (numericAmount > 50000) {
      return NextResponse.json({ error: 'Amount cannot exceed 50,000' }, { status: 400 });
    }

    // Taksit sayısı kontrolü
    const installments = parseInt(installment_count) || 1;
    if (installments < 1 || installments > 12) {
      return NextResponse.json({ error: 'Installment count must be between 1 and 12' }, { status: 400 });
    }

    // Bekleyen avans talebi kontrolü
    const { data: existingRequests, error: checkError } = await supabase
      .from('advance_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (checkError) {
      console.error('Error checking existing requests:', checkError);
      return NextResponse.json({ error: 'Failed to check existing requests' }, { status: 500 });
    }

    if (existingRequests && existingRequests.length > 0) {
      return NextResponse.json({ error: 'You already have a pending advance request' }, { status: 400 });
    }

    // Avans talebini oluştur
    const { data: advanceRequest, error } = await supabase
      .from('advance_requests')
      .insert({
        user_id: user.id,
        amount: numericAmount,
        currency: currency || 'TRY',
        reason,
        repayment_plan: repayment_plan || 'salary',
        installment_count: installments
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating advance request:', error);
      return NextResponse.json({ error: 'Failed to create advance request' }, { status: 500 });
    }

    // Avans kategorisindeki destek kişilerine otomatik atama yap
    try {
      // Avans kategorisini bul
      const { data: advanceCategory, error: categoryError } = await supabase
        .from('support_categories')
        .select('id')
        .eq('name', 'Avans Talebi')
        .eq('is_system', true)
        .single();

      if (categoryError || !advanceCategory) {
        console.error('Avans kategorisi bulunamadı:', categoryError);
      } else {
        // Bu kategoriye atanmış destek kişilerini bul
        const { data: agents, error: agentsError } = await supabase
          .from('support_agents')
          .select('user_id')
          .eq('category_id', advanceCategory.id);

        if (agentsError) {
          console.error('Avans destek kişileri getirilirken hata:', agentsError);
        } else if (agents && agents.length > 0) {
          // Rastgele bir destek kişisi seç
          const randomIndex = Math.floor(Math.random() * agents.length);
          const assignedAgent = agents[randomIndex].user_id;

          // Avans talebini güncelle - assigned_to alanı ekle (eğer alan varsa)
          try {
            const { error: updateError } = await supabase
              .from('advance_requests')
              .update({ assigned_to: assignedAgent })
              .eq('id', advanceRequest.id);

            if (updateError) {
              console.error('Avans talebi atama güncellemesi hatası (alan henüz yok olabilir):', updateError);
            } else {
              console.log('✅ Avans talebi destek kişisine atandı:', assignedAgent);
            }
          } catch (updateError) {
            console.error('Avans talebi atama güncellemesi hatası:', updateError);
          }

          // Atanan kişiye bildirim gönder
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              recipient_id: assignedAgent,
              title: 'Yeni Avans Talebi Atandı',
              message: `${advanceRequest.amount} ${advanceRequest.currency} tutarında yeni bir avans talebi size atandı.`,
              type: 'advance_request',
              data: {
                advance_request_id: advanceRequest.id,
                amount: advanceRequest.amount,
                currency: advanceRequest.currency,
                user_id: user.id
              }
            });

          if (notificationError) {
            console.error('Bildirim gönderme hatası:', notificationError);
          } else {
            console.log('✅ Atanan kişiye bildirim gönderildi');
          }
        } else {
          console.log('⚠️ Avans kategorisinde destek kişisi bulunamadı');
        }
      }
    } catch (assignmentError) {
      console.error('Avans atama işlemi hatası:', assignmentError);
      // Atama hatası talep oluşturmayı engellemez
    }

    return NextResponse.json({
      success: true,
      message: 'Advance request created successfully',
      data: advanceRequest
    });

  } catch (error: any) {
    console.error('Advance request creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { advance_request_id, status, rejection_reason } = body;

    // Validasyon
    if (!advance_request_id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Kullanıcının yetki kontrolü
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('authority_level')
      .eq('id', user.id)
      .single();

    // Admin, manager, team_lead, director yetkisi varsa genel yetki ver
    const hasGeneralAuthority = userProfile && [
      'admin', 
      'manager', 
      'team_lead', 
      'director'
    ].includes(userProfile.authority_level);

    // Avans kategorisinde support agent mi kontrol et
    let hasAdvanceCategory = false;
    if (!hasGeneralAuthority) {
      const { data: supportAgents, error: agentError } = await supabase
        .from('support_agents')
        .select(`
          category_id,
          support_categories!inner(name)
        `)
        .eq('user_id', user.id);

      if (!agentError && supportAgents) {
        hasAdvanceCategory = supportAgents.some((agent: any) => 
          agent.support_categories.name === 'Avans Talebi'
        );
      }
    }

    if (!hasGeneralAuthority && !hasAdvanceCategory) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Avans talebini güncelle
    const updateData: any = {
      status,
      approved_by: user.id,
      approved_at: new Date().toISOString()
    };

    if (status === 'rejected' && rejection_reason) {
      updateData.rejection_reason = rejection_reason;
    }

    const { data: updatedRequest, error } = await supabase
      .from('advance_requests')
      .update(updateData)
      .eq('id', advance_request_id)
      .select(`
        *,
        user_profiles!advance_requests_user_profiles_fkey(first_name, last_name)
      `)
      .single();

    if (error) {
      console.error('Error updating advance request:', error);
      return NextResponse.json({ error: 'Failed to update advance request' }, { status: 500 });
    }

    // Kullanıcıya bildirim gönder
    try {
      const notificationData = {
        recipient_id: updatedRequest.user_id,
        title: `Avans Talebi ${status === 'approved' ? 'Onaylandı' : 'Reddedildi'}`,
        message: `${updatedRequest.amount} ${updatedRequest.currency} tutarındaki avans talebiniz ${status === 'approved' ? 'onaylandı' : 'reddedildi'}.${
          status === 'rejected' && rejection_reason ? ` Sebep: ${rejection_reason}` : ''
        }`,
        type: 'advance_request_response',
        data: {
          advance_request_id: updatedRequest.id,
          status,
          amount: updatedRequest.amount,
          currency: updatedRequest.currency,
          rejection_reason: rejection_reason || null
        }
      };

      await supabase
        .from('notifications')
        .insert(notificationData);

      console.log('✅ Notification sent to user');
    } catch (notificationError) {
      console.error('❌ Failed to send notification:', notificationError);
      // Bildirim hatası güncellemeyi engellemez
    }

    return NextResponse.json({
      success: true,
      message: `Advance request ${status} successfully`,
      data: updatedRequest
    });

  } catch (error: any) {
    console.error('Advance request update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
