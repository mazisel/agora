import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Görev yönlendirme talebini onaylama/reddetme
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ transferId: string }> }
) {
  try {
    const { transferId } = await params;
    const body = await request.json();
    const { action, rejection_reason } = body; // action: 'approve' | 'reject'

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

    // Transfer talebini al
    const { data: transfer, error: transferError } = await supabase
      .from('task_transfers')
      .select(`
        *,
        task:tasks(*),
        from_user:user_profiles!task_transfers_from_user_id_fkey(*),
        to_user:user_profiles!task_transfers_to_user_id_fkey(*),
        requester:user_profiles!task_transfers_requested_by_fkey(*)
      `)
      .eq('id', transferId)
      .eq('status', 'pending')
      .single();

    if (transferError || !transfer) {
      return NextResponse.json({ error: 'Transfer request not found or already processed' }, { status: 404 });
    }

    // Yetki kontrolü
    const canApprove = 
      transfer.to_user_id === user.id || // Hedef kullanıcı
      ['manager', 'director', 'admin'].includes(userProfile.authority_level) || // Yöneticiler
      (transfer.task?.project?.project_manager_id === user.id); // Proje yöneticisi

    if (!canApprove) {
      return NextResponse.json({ 
        error: 'Bu yönlendirme talebini onaylama/reddetme yetkiniz yok' 
      }, { status: 403 });
    }

    let result;
    let message;

    if (action === 'approve') {
      // Yönlendirme talebini onayla
      const { data: approveResult, error: approveError } = await supabase
        .rpc('approve_task_transfer', {
          p_transfer_id: transferId,
          p_approved_by: user.id
        });

      if (approveError || !approveResult) {
        console.error('Approve transfer error:', approveError);
        return NextResponse.json({ 
          error: 'Yönlendirme talebi onaylanamadı' 
        }, { status: 500 });
      }

      result = approveResult;
      message = 'Görev başarıyla yönlendirildi';

      // Bildirimler gönder
      const taskTitle = transfer.task?.title || 'Görev';
      
      // Eski sorumluya bildirim
      if (transfer.from_user_id !== user.id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: transfer.from_user_id,
            title: 'Görev Yönlendirildi',
            message: `"${taskTitle}" göreviniz ${transfer.to_user.first_name} ${transfer.to_user.last_name} kişisine yönlendirildi.`,
            type: 'info',
            related_id: transfer.task_id,
            related_type: 'task'
          });
      }

      // Yeni sorumluya bildirim
      if (transfer.to_user_id !== user.id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: transfer.to_user_id,
            title: 'Yeni Görev Atandı',
            message: `"${taskTitle}" görevi size atandı. Sebep: ${transfer.reason}`,
            type: 'success',
            related_id: transfer.task_id,
            related_type: 'task'
          });
      }

      // Talep edene bildirim
      if (transfer.requested_by !== user.id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: transfer.requested_by,
            title: 'Yönlendirme Talebi Onaylandı',
            message: `"${taskTitle}" görevi için yönlendirme talebiniz onaylandı.`,
            type: 'success',
            related_id: transfer.task_id,
            related_type: 'task'
          });
      }

    } else if (action === 'reject') {
      // Yönlendirme talebini reddet
      const { data: rejectResult, error: rejectError } = await supabase
        .rpc('reject_task_transfer', {
          p_transfer_id: transferId,
          p_approved_by: user.id,
          p_rejection_reason: rejection_reason || 'Sebep belirtilmedi'
        });

      if (rejectError || !rejectResult) {
        console.error('Reject transfer error:', rejectError);
        return NextResponse.json({ 
          error: 'Yönlendirme talebi reddedilemedi' 
        }, { status: 500 });
      }

      result = rejectResult;
      message = 'Yönlendirme talebi reddedildi';

      // Talep edene bildirim
      const taskTitle = transfer.task?.title || 'Görev';
      await supabase
        .from('notifications')
        .insert({
          user_id: transfer.requested_by,
          title: 'Yönlendirme Talebi Reddedildi',
          message: `"${taskTitle}" görevi için yönlendirme talebiniz reddedildi. Sebep: ${rejection_reason || 'Sebep belirtilmedi'}`,
          type: 'error',
          related_id: transfer.task_id,
          related_type: 'task'
        });

    } else {
      return NextResponse.json({ 
        error: 'Geçersiz işlem. "approve" veya "reject" olmalı' 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
      message
    });

  } catch (error) {
    console.error('Transfer action error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Transfer talebini görüntüleme
export async function GET(
  request: NextRequest,
  { params }: { params: { transferId: string } }
) {
  try {
    const { transferId } = params;

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

    // Transfer talebini al
    const { data: transfer, error: transferError } = await supabase
      .from('task_transfers')
      .select(`
        *,
        task:tasks(
          id, title, description, status, priority,
          project:projects(id, name, project_manager_id)
        ),
        from_user:user_profiles!task_transfers_from_user_id_fkey(id, first_name, last_name, profile_photo_url, position, department),
        to_user:user_profiles!task_transfers_to_user_id_fkey(id, first_name, last_name, profile_photo_url, position, department),
        requester:user_profiles!task_transfers_requested_by_fkey(id, first_name, last_name, profile_photo_url, position, department),
        approver:user_profiles!task_transfers_approved_by_fkey(id, first_name, last_name, profile_photo_url, position, department)
      `)
      .eq('id', transferId)
      .single();

    if (transferError || !transfer) {
      return NextResponse.json({ error: 'Transfer request not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: transfer
    });

  } catch (error) {
    console.error('Get transfer error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Transfer talebini iptal etme (sadece talep eden kişi)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { transferId: string } }
) {
  try {
    const { transferId } = params;

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

    // Transfer talebini al ve yetki kontrolü yap
    const { data: transfer, error: transferError } = await supabase
      .from('task_transfers')
      .select('*')
      .eq('id', transferId)
      .eq('requested_by', user.id)
      .eq('status', 'pending')
      .single();

    if (transferError || !transfer) {
      return NextResponse.json({ 
        error: 'Transfer request not found or cannot be cancelled' 
      }, { status: 404 });
    }

    // Transfer talebini sil
    const { error: deleteError } = await supabase
      .from('task_transfers')
      .delete()
      .eq('id', transferId);

    if (deleteError) {
      console.error('Delete transfer error:', deleteError);
      return NextResponse.json({ 
        error: 'Yönlendirme talebi iptal edilemedi' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Yönlendirme talebi iptal edildi'
    });

  } catch (error) {
    console.error('Cancel transfer error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
