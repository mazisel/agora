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
      .from('vehicle_requests')
      .select(`
        *,
        user_profiles!vehicle_requests_user_id_fkey(
          id,
          first_name,
          last_name,
          email,
          department,
          position
        ),
        vehicles(
          id,
          plate_number,
          brand,
          model,
          color
        ),
        reviewed_by_profile:user_profiles!vehicle_requests_reviewed_by_fkey(
          id,
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
      console.error('Error fetching vehicle requests for admin:', error);
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
    console.error('Error in GET /api/admin/vehicle-requests:', error);
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
      vehicle_id,
      admin_notes,
      reviewed_by
    } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Request ID and status are required' },
        { status: 400 }
      );
    }

    // Start a transaction for approval process
    if (status === 'approved' && vehicle_id) {
      // First, get the request details
      const { data: requestData, error: requestError } = await supabaseServer
        .from('vehicle_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (requestError) {
        console.error('Error fetching request:', requestError);
        return NextResponse.json(
          { error: 'Failed to fetch request details', details: requestError.message },
          { status: 500 }
        );
      }

      // Check vehicle availability using the function
      const { data: availabilityCheck, error: availabilityError } = await supabaseServer
        .rpc('check_vehicle_availability', {
          p_vehicle_id: vehicle_id,
          p_date: requestData.request_date,
          p_start_time: requestData.start_time,
          p_end_time: requestData.end_time,
          p_exclude_request_id: id
        });

      if (availabilityError) {
        console.error('Error checking availability:', availabilityError);
        return NextResponse.json(
          { error: 'Failed to check vehicle availability', details: availabilityError.message },
          { status: 500 }
        );
      }

      if (!availabilityCheck) {
        return NextResponse.json(
          { error: 'Selected vehicle is not available for the requested time slot' },
          { status: 400 }
        );
      }

      // Update the request
      const { data: updatedRequest, error: updateError } = await supabaseServer
        .from('vehicle_requests')
        .update({
          status,
          vehicle_id,
          admin_notes,
          reviewed_by,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          user_profiles!vehicle_requests_user_id_fkey(
            id,
            first_name,
            last_name,
            email
          ),
          vehicles(
            id,
            plate_number,
            brand,
            model,
            color
          )
        `)
        .single();

      if (updateError) {
        console.error('Error updating request:', updateError);
        return NextResponse.json(
          { error: 'Failed to update request', details: updateError.message },
          { status: 500 }
        );
      }

      // Create reservation
      const { data: reservation, error: reservationError } = await supabaseServer
        .from('vehicle_reservations')
        .insert([{
          request_id: id,
          vehicle_id,
          user_id: requestData.user_id,
          reservation_date: requestData.request_date,
          end_date: requestData.end_date,
          start_time: requestData.start_time,
          end_time: requestData.end_time,
          destination: requestData.destination,
          status: 'active'
        }])
        .select()
        .single();

      if (reservationError) {
        console.error('Error creating reservation:', reservationError);
        // Rollback the request update
        await supabaseServer
          .from('vehicle_requests')
          .update({
            status: 'pending',
            vehicle_id: null,
            admin_notes: null,
            reviewed_by: null,
            reviewed_at: null
          })
          .eq('id', id);

        return NextResponse.json(
          { error: 'Failed to create reservation', details: reservationError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        request: updatedRequest,
        reservation: reservation
      });

    } else {
      // Simple status update (reject, etc.)
      const { data, error } = await supabaseServer
        .from('vehicle_requests')
        .update({
          status,
          admin_notes,
          reviewed_by,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          user_profiles!vehicle_requests_user_id_fkey(
            id,
            first_name,
            last_name,
            email
          ),
          vehicles(
            id,
            plate_number,
            brand,
            model,
            color
          )
        `)
        .single();

      if (error) {
        console.error('Error updating request:', error);
        return NextResponse.json(
          { error: 'Failed to update request', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        request: data
      });
    }

  } catch (error: any) {
    console.error('Error in PUT /api/admin/vehicle-requests:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
