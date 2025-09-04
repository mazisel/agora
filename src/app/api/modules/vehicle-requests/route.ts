import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    let query = supabaseServer
      .from('vehicle_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching vehicle requests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch vehicle requests', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      requests: data || []
    });

  } catch (error: any) {
    console.error('Error in GET /api/modules/vehicle-requests:', error);
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
      start_date,
      end_date,
      destination,
      purpose,
      passenger_count = 1
    } = body;

    console.log('Received data:', { user_id, start_date, end_date, destination, purpose, passenger_count });

    // Validate required fields
    if (!user_id || !start_date || !end_date || !destination || !purpose) {
      console.log('Validation failed - missing fields');
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate date format
    if (new Date(start_date) > new Date(end_date)) {
      console.log('Validation failed - invalid date range');
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Insert new vehicle request
    const { data, error } = await supabaseServer
      .from('vehicle_requests')
      .insert([{
        user_id,
        request_date: start_date,
        end_date: end_date,
        start_time: '09:00:00',
        end_time: '17:00:00',
        destination,
        purpose,
        passenger_count,
        status: 'pending'
      }])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating vehicle request:', error);
      return NextResponse.json(
        { error: 'Failed to create vehicle request', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      request: data
    });

  } catch (error: any) {
    console.error('Error in POST /api/modules/vehicle-requests:', error);
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
      request_date,
      start_time,
      end_time,
      destination,
      purpose,
      passenger_count,
      status
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    // Update vehicle request
    const { data, error } = await supabaseServer
      .from('vehicle_requests')
      .update({
        request_date,
        start_time,
        end_time,
        destination,
        purpose,
        passenger_count,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating vehicle request:', error);
      return NextResponse.json(
        { error: 'Failed to update vehicle request', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      request: data
    });

  } catch (error: any) {
    console.error('Error in PUT /api/modules/vehicle-requests:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
