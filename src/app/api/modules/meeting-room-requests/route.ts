import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const calendar = searchParams.get('calendar');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabaseServer
      .from('meeting_room_requests')
      .select(`
        *,
        meeting_rooms (
          id,
          name,
          location,
          capacity,
          equipment
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

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Calendar mode - return events for calendar display
    if (calendar === 'true') {
      if (startDate && endDate) {
        query = query
          .gte('meeting_date', startDate)
          .lte('meeting_date', endDate)
          .in('status', ['approved', 'pending']);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching calendar events:', error);
        return NextResponse.json(
          { error: 'Failed to fetch calendar events', details: error.message },
          { status: 500 }
        );
      }

      // Transform data for calendar
      const events = data?.map(request => ({
        id: request.id,
        title: request.title,
        start_time: `${request.meeting_date}T${request.start_time}`,
        end_time: `${request.meeting_date}T${request.end_time}`,
        room_name: request.meeting_rooms?.name || 'Oda Atanmamış',
        status: request.status
      })) || [];

      return NextResponse.json({
        success: true,
        events
      });
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
    console.error('Error in GET /api/modules/meeting-room-requests:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      title,
      description,
      room_id,
      meeting_date,
      start_time,
      end_time,
      participant_count = 1,
      catering_needed = false,
      catering_details
    } = body;

    console.log('Received data:', { 
      user_id, title, description, room_id, meeting_date, start_time, end_time, 
      participant_count, catering_needed, catering_details 
    });

    // Validate required fields
    if (!user_id || !title || !meeting_date || !start_time || !end_time) {
      console.log('Validation failed - missing fields');
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    // Validate time format
    if (start_time >= end_time) {
      console.log('Validation failed - invalid time range');
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    // Insert new meeting room request
    const { data, error } = await supabaseServer
      .from('meeting_room_requests')
      .insert([{
        user_id,
        title,
        description,
        room_id,
        meeting_date,
        start_time,
        end_time,
        participant_count,
        catering_needed,
        catering_details,
        status: 'pending'
      }])
      .select(`
        *,
        meeting_rooms (
          id,
          name,
          location,
          capacity,
          equipment
        ),
        user_profiles!meeting_room_requests_user_id_fkey (
          id,
          first_name,
          last_name,
          email,
          department,
          position
        )
      `)
      .single();

    if (error) {
      console.error('Error creating meeting room request:', error);
      return NextResponse.json(
        { error: 'Failed to create meeting room request', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      request: data
    });

  } catch (error: any) {
    console.error('Error in POST /api/modules/meeting-room-requests:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      title,
      description,
      room_id,
      meeting_date,
      start_time,
      end_time,
      participant_count,
      catering_needed,
      catering_details,
      status
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    // Update meeting room request
    const { data, error } = await supabaseServer
      .from('meeting_room_requests')
      .update({
        title,
        description,
        room_id,
        meeting_date,
        start_time,
        end_time,
        participant_count,
        catering_needed,
        catering_details,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        meeting_rooms (
          id,
          name,
          location,
          capacity,
          equipment
        ),
        user_profiles!meeting_room_requests_user_id_fkey (
          id,
          first_name,
          last_name,
          email,
          department,
          position
        )
      `)
      .single();

    if (error) {
      console.error('Error updating meeting room request:', error);
      return NextResponse.json(
        { error: 'Failed to update meeting room request', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      request: data
    });

  } catch (error: any) {
    console.error('Error in PUT /api/modules/meeting-room-requests:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
