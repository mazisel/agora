import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Görev yönlendirme talebi oluşturma
export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params;
    const body = await request.json();
    const { to_user_id, reason, transfer_type } = body;

    // Authorization header'dan token al
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Kullanıcı profilini al
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Görevi al
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*, assignee:user_profiles!tasks_assigned_to_fkey(*)')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Yetki kontrolü - sadece görevin sahibi veya yöneticiler yönlendirme yapabilir
    const canTransfer = 
      task.assigned_to === user.id || 
      task.created_by === user.id ||
      ['team_lead', 'manager', 'director', 'admin'].includes(userProfile.authority_level);

    if (!canTransfer) {
      return NextResponse.json({ 
        error: 'Bu görevi yönlendirme yetkiniz yok' 
      }, { status: 403 });
    }

    // Hedef kullanıcıyı kontrol et
    const { data: targetUser, error: targetError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', to_user_id)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Aynı kişiye yönlendirme kontrolü
    if (task.assigned_to === to_user_id) {
      return NextResponse.json({ 
        error: 'Görev zaten bu kişiye atanmış' 
      }, { status: 400 });
    }

    // Yönlendirme talebi oluştur
    const { data: transferRequest, error: transferError } = await supabase
      .rpc('create_task_transfer_request', {
        p_task_id: taskId,
        p_from_user_id: task.assigned_to,
        p_to_user_id: to_user_id,
        p_reason: reason,
        p_transfer_type: transfer_type,
        p_requested_by: user.id
      });

    if (transferError) {
      console.error('Transfer request error:', transferError);
      return NextResponse.json({ 
        error: 'Yönlendirme talebi oluşturulamadı' 
      }, { status: 500 });
    }

    // Bildirim gönder (hedef kullanıcıya)
    await supabase
      .from('notifications')
      .insert({
        user_id: to_user_id,
        title: 'Yeni Görev Yönlendirme Talebi',
        message: `"${task.title}" görevi size yönlendirilmek isteniyor. Sebep: ${reason}`,
        type: 'info',
        related_id: transferRequest,
        related_type: 'task_transfer'
      });

    // Eğer yönetici değilse, yöneticiye de bildirim gönder
    if (!['manager', 'director', 'admin'].includes(userProfile.authority_level)) {
      // Proje yöneticisine bildirim gönder
      if (task.project?.project_manager_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: task.project.project_manager_id,
            title: 'Görev Yönlendirme Talebi - Onay Bekliyor',
            message: `${userProfile.first_name} ${userProfile.last_name}, "${task.title}" görevini ${targetUser.first_name} ${targetUser.last_name} kişisine yönlendirmek istiyor.`,
            type: 'warning',
            related_id: transferRequest,
            related_type: 'task_transfer'
          });
      }
    }

    return NextResponse.json({
      success: true,
      data: { transfer_id: transferRequest },
      message: 'Yönlendirme talebi oluşturuldu'
    });

  } catch (error) {
    console.error('Task transfer error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Görev yönlendirme taleplerini listeleme
export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params;

    // Authorization header'dan token al
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Görev yönlendirme taleplerini al
    const { data: transfers, error: transfersError } = await supabase
      .from('task_transfers')
      .select(`
        *,
        from_user:user_profiles!task_transfers_from_user_id_fkey(id, first_name, last_name, profile_photo_url),
        to_user:user_profiles!task_transfers_to_user_id_fkey(id, first_name, last_name, profile_photo_url),
        requester:user_profiles!task_transfers_requested_by_fkey(id, first_name, last_name, profile_photo_url),
        approver:user_profiles!task_transfers_approved_by_fkey(id, first_name, last_name, profile_photo_url)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (transfersError) {
      console.error('Transfers fetch error:', transfersError);
      return NextResponse.json({ 
        error: 'Yönlendirme talepleri alınamadı' 
      }, { status: 500 });
    }

    // Görev yönlendirme geçmişini al
    const { data: history, error: historyError } = await supabase
      .from('task_transfer_history')
      .select(`
        *,
        from_user:user_profiles!task_transfer_history_from_user_id_fkey(id, first_name, last_name, profile_photo_url),
        to_user:user_profiles!task_transfer_history_to_user_id_fkey(id, first_name, last_name, profile_photo_url),
        transferrer:user_profiles!task_transfer_history_transferred_by_fkey(id, first_name, last_name, profile_photo_url)
      `)
      .eq('task_id', taskId)
      .order('transferred_at', { ascending: false });

    if (historyError) {
      console.error('Transfer history fetch error:', historyError);
      return NextResponse.json({ 
        error: 'Yönlendirme geçmişi alınamadı' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        pending_transfers: transfers || [],
        transfer_history: history || []
      }
    });

  } catch (error) {
    console.error('Get task transfers error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
