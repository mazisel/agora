import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    let query = supabaseServer
      .from('office_supplies_requests')
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
      console.error('Error fetching office supplies requests:', error);
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
    console.error('Error in GET /api/modules/office-supplies:', error);
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
      items,
      justification,
      urgency_level = 'normal',
      department,
      cost_center,
      estimated_cost
    } = body;

    console.log('Received data:', { user_id, items, justification, urgency_level, department, cost_center, estimated_cost });

    // Validate required fields
    if (!user_id || !items || !Array.isArray(items) || items.length === 0) {
      console.log('Validation failed - missing fields');
      return NextResponse.json(
        { error: 'User ID and items are required' },
        { status: 400 }
      );
    }

    // Validate items structure
    for (const item of items) {
      if (!item.name || !item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { error: 'Each item must have a name and positive quantity' },
          { status: 400 }
        );
      }
    }

    // Insert new office supplies request
    const { data, error } = await supabaseServer
      .from('office_supplies_requests')
      .insert([{
        user_id,
        items,
        justification,
        urgency_level,
        department,
        cost_center,
        estimated_cost,
        status: 'pending'
      }])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating office supplies request:', error);
      return NextResponse.json(
        { error: 'Failed to create office supplies request', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      request: data
    });

  } catch (error: any) {
    console.error('Error in POST /api/modules/office-supplies:', error);
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
      items,
      justification,
      urgency_level,
      department,
      cost_center,
      estimated_cost,
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

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Add fields that are provided
    if (items !== undefined) updateData.items = items;
    if (justification !== undefined) updateData.justification = justification;
    if (urgency_level !== undefined) updateData.urgency_level = urgency_level;
    if (department !== undefined) updateData.department = department;
    if (cost_center !== undefined) updateData.cost_center = cost_center;
    if (estimated_cost !== undefined) updateData.estimated_cost = estimated_cost;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'approved' && approved_by) {
        updateData.approved_by = approved_by;
        updateData.approved_at = new Date().toISOString();
      }
      if (status === 'rejected' && rejection_reason) {
        updateData.rejection_reason = rejection_reason;
      }
    }
    if (delivery_date !== undefined) updateData.delivery_date = delivery_date;
    if (notes !== undefined) updateData.notes = notes;

    // Update office supplies request
    const { data, error } = await supabaseServer
      .from('office_supplies_requests')
      .update(updateData)
      .eq('id', id)
      .select('*')
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
    console.error('Error in PUT /api/modules/office-supplies:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
