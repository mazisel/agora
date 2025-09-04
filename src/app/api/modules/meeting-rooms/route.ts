import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const available = searchParams.get('available');
    const active = searchParams.get('active');

    let query = supabaseServer
      .from('meeting_rooms')
      .select('*')
      .order('name', { ascending: true });

    if (available === 'true') {
      query = query.eq('is_available', true);
    }

    if (active === 'true') {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching meeting rooms:', error);
      return NextResponse.json(
        { error: 'Failed to fetch meeting rooms', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      rooms: data || []
    });

  } catch (error: any) {
    console.error('Error in GET /api/modules/meeting-rooms:', error);
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
      name,
      location,
      capacity,
      description,
      equipment,
      hourly_rate,
      image_url
    } = body;

    // Validate required fields
    if (!name || !capacity) {
      return NextResponse.json(
        { error: 'Name and capacity are required' },
        { status: 400 }
      );
    }

    // Insert new meeting room
    const { data, error } = await supabaseServer
      .from('meeting_rooms')
      .insert([{
        name,
        location,
        capacity: parseInt(capacity),
        description,
        equipment: equipment || [],
        hourly_rate: parseFloat(hourly_rate) || 0,
        image_url
      }])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating meeting room:', error);
      return NextResponse.json(
        { error: 'Failed to create meeting room', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      room: data
    });

  } catch (error: any) {
    console.error('Error in POST /api/modules/meeting-rooms:', error);
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
      name,
      location,
      capacity,
      description,
      equipment,
      hourly_rate,
      image_url,
      is_available,
      is_active
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }

    // Update meeting room
    const { data, error } = await supabaseServer
      .from('meeting_rooms')
      .update({
        name,
        location,
        capacity: capacity ? parseInt(capacity) : undefined,
        description,
        equipment,
        hourly_rate: hourly_rate ? parseFloat(hourly_rate) : undefined,
        image_url,
        is_available,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating meeting room:', error);
      return NextResponse.json(
        { error: 'Failed to update meeting room', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      room: data
    });

  } catch (error: any) {
    console.error('Error in PUT /api/modules/meeting-rooms:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
