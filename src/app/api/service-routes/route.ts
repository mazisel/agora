import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('service_routes')
      .select('*')
      .eq('is_active', true)
      .order('departure_time', { ascending: true });

    if (error) {
      console.error('Error fetching service routes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch service routes', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      routes: data || []
    });

  } catch (error: any) {
    console.error('Error in GET /api/service-routes:', error);
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
      route_name,
      description,
      departure_time,
      arrival_time,
      departure_location,
      arrival_location,
      stops = [],
      capacity = 50,
      driver_name,
      driver_phone,
      vehicle_plate,
      days_of_week = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      notes,
      is_active = true
    } = body;

    // Validate required fields
    if (!route_name || !departure_time || !departure_location || !arrival_location) {
      return NextResponse.json(
        { error: 'Route name, departure time, departure location, and arrival location are required' },
        { status: 400 }
      );
    }

    // Insert new route
    const { data, error } = await supabase
      .from('service_routes')
      .insert([{
        route_name,
        description,
        departure_time,
        arrival_time,
        departure_location,
        arrival_location,
        stops,
        capacity,
        driver_name,
        driver_phone,
        vehicle_plate,
        days_of_week,
        notes,
        is_active
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating service route:', error);
      return NextResponse.json(
        { error: 'Failed to create service route', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      route: data
    });

  } catch (error: any) {
    console.error('Error in POST /api/service-routes:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
