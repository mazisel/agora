import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: { routeId: string } }
) {
  try {
    const routeId = params.routeId;
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

    // Update route
    const { data, error } = await supabase
      .from('service_routes')
      .update({
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
      })
      .eq('id', routeId)
      .select()
      .single();

    if (error) {
      console.error('Error updating service route:', error);
      return NextResponse.json(
        { error: 'Failed to update service route', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      route: data
    });

  } catch (error: any) {
    console.error('Error in PUT /api/service-routes/[routeId]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { routeId: string } }
) {
  try {
    const routeId = params.routeId;

    // Delete route
    const { error } = await supabase
      .from('service_routes')
      .delete()
      .eq('id', routeId);

    if (error) {
      console.error('Error deleting service route:', error);
      return NextResponse.json(
        { error: 'Failed to delete service route', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Service route deleted successfully'
    });

  } catch (error: any) {
    console.error('Error in DELETE /api/service-routes/[routeId]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { routeId: string } }
) {
  try {
    const routeId = params.routeId;

    // Get single route
    const { data, error } = await supabase
      .from('service_routes')
      .select('*')
      .eq('id', routeId)
      .single();

    if (error) {
      console.error('Error fetching service route:', error);
      return NextResponse.json(
        { error: 'Failed to fetch service route', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      route: data
    });

  } catch (error: any) {
    console.error('Error in GET /api/service-routes/[routeId]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
