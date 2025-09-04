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
    const type = url.searchParams.get('type'); // 'all' for managers, default for user's own

    if (type === 'all') {
      // Yöneticiler için - sadece kendilerine bağlı personelin taleplerini getir
      console.log('🔍 Checking user authority for:', user.id);
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('authority_level')
        .eq('id', user.id)
        .single();

      console.log('👤 User profile result:', { userProfile, profileError });

      // Admin, manager, team_lead, director yetkisi varsa genel yetki ver
      const hasGeneralAuthority = userProfile && [
        'admin', 
        'manager', 
        'team_lead', 
        'director'
      ].includes(userProfile.authority_level);

      // İzin kategorisinde support agent mi kontrol et (gelecekte kullanılabilir)
      let hasLeaveCategory = false;
      if (!hasGeneralAuthority) {
        // Şimdilik sadece genel yetki kontrolü yapıyoruz
        // İleride izin kategorisi oluşturulursa buraya eklenebilir
      }

      if (!hasGeneralAuthority && !hasLeaveCategory) {
        console.log('❌ Insufficient permissions:', { userProfile, profileError });
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      let leaveRequests;
      let error;

      if (userProfile?.authority_level === 'admin') {
        // Admin ise tüm talepleri getir
        console.log('🔍 Admin - fetching all leave requests');
        const result = await supabase
          .from('leave_requests')
          .select(`
            *,
            user_profiles!leave_requests_user_profiles_fkey(first_name, last_name, manager_id)
          `)
          .order('created_at', { ascending: false });
        
        leaveRequests = result.data;
        error = result.error;
        console.log('📊 Admin result:', { count: leaveRequests?.length, error, data: leaveRequests });
      } else {
        // Team leader ise sadece kendisine bağlı personelin taleplerini getir
        console.log('🔍 Team leader - fetching requests for manager:', user.id);
        const result = await supabase
          .from('leave_requests')
          .select(`
            *,
            user_profiles!leave_requests_user_profiles_fkey!inner(first_name, last_name, manager_id)
          `)
          .eq('user_profiles.manager_id', user.id)
          .order('created_at', { ascending: false });
        
        leaveRequests = result.data;
        error = result.error;
        console.log('📊 Team leader result:', { count: leaveRequests?.length, error, managerId: user.id });
      }

      if (error) {
        console.error('Error fetching all leave requests:', error);
        return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
      }

      return NextResponse.json(leaveRequests || []);
    } else {
      // Kullanıcının kendi izin taleplerini getir
      const { data: leaveRequests, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leave requests:', error);
        return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
      }

      return NextResponse.json(leaveRequests || []);
    }

  } catch (error: any) {
    console.error('Leave requests API error:', error);
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
    const { leave_type, start_date, end_date, reason, emergency_contact } = body;

    // Validasyon
    if (!leave_type || !start_date || !end_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Tarih kontrolü
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      return NextResponse.json({ error: 'Start date cannot be in the past' }, { status: 400 });
    }

    if (endDate < startDate) {
      return NextResponse.json({ error: 'End date cannot be before start date' }, { status: 400 });
    }

    // Kullanıcının bilgilerini al
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, manager_id, department_id')
      .eq('id', user.id)
      .single();

    // İzin talebini oluştur
    const { data: leaveRequest, error } = await supabase
      .from('leave_requests')
      .insert({
        user_id: user.id,
        leave_type,
        start_date,
        end_date,
        reason,
        emergency_contact
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating leave request:', error);
      return NextResponse.json({ error: 'Failed to create leave request' }, { status: 500 });
    }

    // Yönetici ID'sini al (sadece kişisel yönetici)
    const managerId = userProfile?.manager_id;

    // İzin talebini yöneticiye ata (assigned_to alanı varsa)
    if (managerId) {
      try {
        const { error: updateError } = await supabase
          .from('leave_requests')
          .update({ assigned_to: managerId })
          .eq('id', leaveRequest.id);

        if (updateError) {
          console.error('İzin talebi atama güncellemesi hatası (alan henüz yok olabilir):', updateError);
        } else {
          console.log('✅ İzin talebi yöneticiye atandı:', managerId);
        }
      } catch (updateError) {
        console.error('İzin talebi atama güncellemesi hatası:', updateError);
      }
    }

    // Yöneticiye bildirim gönder
    if (managerId) {
      try {
        // Yöneticinin bilgilerini al
        const { data: managerProfile } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, email')
          .eq('id', managerId)
          .single();

        const managerName = managerProfile ? `${managerProfile.first_name} ${managerProfile.last_name}` : 'Yönetici';
        const userName = userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Bir kullanıcı';
        
        const notificationData = {
          recipient_id: managerId,
          title: 'Yeni İzin Talebi',
          message: `${userName} tarafından ${leave_type === 'annual' ? 'yıllık izin' : 
                   leave_type === 'sick' ? 'hastalık izni' : 
                   leave_type === 'personal' ? 'kişisel izin' : 
                   leave_type === 'maternity' ? 'doğum izni' : 'izin'} talebi oluşturuldu.`,
          type: 'leave_request',
          data: {
            leave_request_id: leaveRequest.id,
            user_name: userName,
            leave_type,
            start_date,
            end_date,
            reason
          }
        };

        await supabase
          .from('notifications')
          .insert(notificationData);

        console.log('✅ Notification sent to manager:', managerName);
      } catch (notificationError) {
        console.error('❌ Failed to send notification:', notificationError);
        // Bildirim hatası talebi engellemez
      }
    } else {
      console.log('⚠️ No manager found for user');
    }

    return NextResponse.json({
      success: true,
      message: 'Leave request created successfully',
      data: leaveRequest
    });

  } catch (error: any) {
    console.error('Leave request creation error:', error);
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
    const { leave_request_id, status, rejection_reason } = body;

    // Validasyon
    if (!leave_request_id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Kullanıcının yetki kontrolü (admin veya team_leader olmalı)
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('authority_level')
      .eq('id', user.id)
      .single();

    if (!userProfile || !['admin', 'team_leader'].includes(userProfile.authority_level)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // İzin talebini güncelle
    const updateData: any = {
      status,
      approved_by: user.id,
      approved_at: new Date().toISOString()
    };

    if (status === 'rejected' && rejection_reason) {
      updateData.rejection_reason = rejection_reason;
    }

    const { data: updatedRequest, error } = await supabase
      .from('leave_requests')
      .update(updateData)
      .eq('id', leave_request_id)
      .select(`
        *,
        user_profiles!leave_requests_user_profiles_fkey(first_name, last_name)
      `)
      .single();

    if (error) {
      console.error('Error updating leave request:', error);
      return NextResponse.json({ error: 'Failed to update leave request' }, { status: 500 });
    }

    // Kullanıcıya bildirim gönder
    try {
      const notificationData = {
        recipient_id: updatedRequest.user_id,
        title: `İzin Talebi ${status === 'approved' ? 'Onaylandı' : 'Reddedildi'}`,
        message: `${updatedRequest.leave_type === 'annual' ? 'Yıllık izin' : 
                 updatedRequest.leave_type === 'sick' ? 'Hastalık izni' : 
                 updatedRequest.leave_type === 'personal' ? 'Kişisel izin' : 
                 updatedRequest.leave_type === 'maternity' ? 'Doğum izni' : 'İzin'} talebiniz ${status === 'approved' ? 'onaylandı' : 'reddedildi'}.${
                 status === 'rejected' && rejection_reason ? ` Sebep: ${rejection_reason}` : ''
                 }`,
        type: 'leave_request_response',
        data: {
          leave_request_id: updatedRequest.id,
          status,
          rejection_reason: rejection_reason || null
        }
      };

      await supabase
        .from('notifications')
        .insert(notificationData);

      console.log('✅ Notification sent to user:', updatedRequest.user?.full_name);
    } catch (notificationError) {
      console.error('❌ Failed to send notification:', notificationError);
      // Bildirim hatası güncellemeyi engellemez
    }

    return NextResponse.json({
      success: true,
      message: `Leave request ${status} successfully`,
      data: updatedRequest
    });

  } catch (error: any) {
    console.error('Leave request update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
