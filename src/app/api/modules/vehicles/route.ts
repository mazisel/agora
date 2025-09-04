import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isAvailable = searchParams.get('available');
    const isActive = searchParams.get('active');

    let query = supabaseServer
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });

    if (isAvailable !== null) {
      query = query.eq('is_available', isAvailable === 'true');
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch vehicles', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      vehicles: data || []
    });

  } catch (error: any) {
    console.error('Error in GET /api/modules/vehicles:', error);
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
      plate_number,
      brand,
      model,
      year,
      color,
      fuel_type = 'benzin',
      capacity = 5,
      notes
    } = body;

    // Validate required fields
    if (!plate_number || !brand || !model) {
      return NextResponse.json(
        { error: 'Plate number, brand and model are required' },
        { status: 400 }
      );
    }

    // Insert new vehicle
    const { data, error } = await supabaseServer
      .from('vehicles')
      .insert([{
        plate_number,
        brand,
        model,
        year,
        color,
        fuel_type,
        capacity,
        notes,
        is_available: true,
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating vehicle:', error);
      return NextResponse.json(
        { error: 'Failed to create vehicle', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      vehicle: data
    });

  } catch (error: any) {
    console.error('Error in POST /api/modules/vehicles:', error);
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
      plate_number,
      brand,
      model,
      year,
      color,
      fuel_type,
      capacity,
      is_available,
      is_active,
      notes
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    // Update vehicle
    const { data, error } = await supabaseServer
      .from('vehicles')
      .update({
        plate_number,
        brand,
        model,
        year,
        color,
        fuel_type,
        capacity,
        is_available,
        is_active,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating vehicle:', error);
      return NextResponse.json(
        { error: 'Failed to update vehicle', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      vehicle: data
    });

  } catch (error: any) {
    console.error('Error in PUT /api/modules/vehicles:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    // Check if vehicle has active reservations
    const { data: reservations, error: reservationError } = await supabaseServer
      .from('vehicle_reservations')
      .select('id')
      .eq('vehicle_id', id)
      .eq('status', 'active');

    if (reservationError) {
      console.error('Error checking reservations:', reservationError);
      return NextResponse.json(
        { error: 'Failed to check vehicle reservations', details: reservationError.message },
        { status: 500 }
      );
    }

    if (reservations && reservations.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vehicle with active reservations' },
        { status: 400 }
      );
    }

    // Delete vehicle
    const { error } = await supabaseServer
      .from('vehicles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting vehicle:', error);
      return NextResponse.json(
        { error: 'Failed to delete vehicle', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Vehicle deleted successfully'
    });

  } catch (error: any) {
    console.error('Error in DELETE /api/modules/vehicles:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
