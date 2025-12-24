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

    let query = supabaseServer
      .from('meeting_room_requests')
      .select(`
        *,
        meeting_rooms (
          id,
          name,
          location,
          capacity,
          equipment:amenities
        ),
        user_profiles!meeting_room_requests_user_id_fkey (
          id,
          first_name,
          last_name,
          email,
          department,
          position
        ),
        reviewed_by_profile:user_profiles!meeting_room_requests_reviewed_by_fkey (
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching meeting room requests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch meeting room requests', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      requests: data || []
    });

  } catch (error: any) {
    console.error('Error in GET /api/admin/meeting-room-requests:', error);
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
      room_id,
      admin_notes,
      reviewed_by
    } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Request ID and status are required' },
        { status: 400 }
      );
    }

    // Start a transaction
    const updates: any = {
      status,
      admin_notes,
      reviewed_by,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (room_id) {
      updates.room_id = room_id;
    }

    // Update the request
    const { data: requestData, error: requestError } = await supabaseServer
      .from('meeting_room_requests')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        meeting_rooms (
          id,
          name,
          location,
          capacity,
          equipment:amenities
        ),
        user_profiles!meeting_room_requests_user_id_fkey (
          id,
          first_name,
          last_name,
          email,
          department,
          position
        ),
        reviewed_by_profile:user_profiles!meeting_room_requests_reviewed_by_fkey (
          first_name,
          last_name
        )
      `)
      .single();

    if (requestError) {
      console.error('Error updating meeting room request:', requestError);
      return NextResponse.json(
        { error: 'Failed to update meeting room request', details: requestError.message },
        { status: 500 }
      );
    }

    // If approved, create a reservation
    if (status === 'approved' && room_id && requestData) {
      const { error: reservationError } = await supabaseServer
        .from('meeting_room_reservations')
        .insert([{
          request_id: id,
          room_id: room_id,
          user_id: requestData.user_id,
          title: requestData.title,
          meeting_date: requestData.meeting_date,
          start_time: requestData.start_time,
          end_time: requestData.end_time,
          participant_count: requestData.participant_count,
          status: 'active'
        }]);

      if (reservationError) {
        console.error('Error creating reservation:', reservationError);
        // Rollback the request update
        await supabaseServer
          .from('meeting_room_requests')
          .update({ status: 'pending', reviewed_by: null, reviewed_at: null })
          .eq('id', id);

        return NextResponse.json(
          { error: 'Failed to create reservation', details: reservationError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      request: requestData
    });

  } catch (error: any) {
    console.error('Error in PUT /api/admin/meeting-room-requests:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    // Delete the request (this will also delete related reservations due to CASCADE)
    const { error } = await supabaseServer
      .from('meeting_room_requests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting meeting room request:', error);
      return NextResponse.json(
        { error: 'Failed to delete meeting room request', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Meeting room request deleted successfully'
    });

  } catch (error: any) {
    console.error('Error in DELETE /api/admin/meeting-room-requests:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
