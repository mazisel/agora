import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateUser, isAdmin } from '@/lib/auth-helper';

export async function GET(request: NextRequest) {
  try {
    // Authentication kontrolü
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin yetkisi kontrolü
    const userIsAdmin = await isAdmin(authResult.user.id);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    let query = supabaseServer
      .from('office_supplies_requests')
      .select(`
        *,
        user_profiles!office_supplies_requests_user_id_fkey (
          first_name,
          last_name,
          personnel_number,
          department,
          position
        ),
        approver:user_profiles!office_supplies_requests_approved_by_fkey (
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching office supplies requests for admin:', error);
      return NextResponse.json(
        { error: 'Failed to fetch office supplies requests', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      requests: data || []
    });

  } catch (error: any) {
    console.error('Error in GET /api/admin/office-supplies:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authentication kontrolü
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin yetkisi kontrolü
    const userIsAdmin = await isAdmin(authResult.user.id);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      status,
      approved_by,
      rejection_reason,
      delivery_date,
      notes
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'approved' && approved_by) {
      updateData.approved_by = approved_by;
      updateData.approved_at = new Date().toISOString();
    }

    if (status === 'rejected' && rejection_reason) {
      updateData.rejection_reason = rejection_reason;
    }

    if (delivery_date) {
      updateData.delivery_date = delivery_date;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Update office supplies request
    const { data, error } = await supabaseServer
      .from('office_supplies_requests')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        user_profiles!office_supplies_requests_user_id_fkey (
          first_name,
          last_name,
          personnel_number,
          department,
          position
        ),
        approver:user_profiles!office_supplies_requests_approved_by_fkey (
          first_name,
          last_name
        )
      `)
      .single();

    if (error) {
      console.error('Error updating office supplies request:', error);
      return NextResponse.json(
        { error: 'Failed to update office supplies request', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      request: data
    });

  } catch (error: any) {
    console.error('Error in PUT /api/admin/office-supplies:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
