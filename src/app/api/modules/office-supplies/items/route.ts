import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    let query = supabaseServer
      .from('office_supplies_items')
      .select(`
        *,
        category:office_supplies_categories(id, name)
      `)
      .eq('is_active', true)
      .order('name');

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching office supplies items:', error);
      return NextResponse.json(
        { error: 'Failed to fetch items', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      items: data || []
    });

  } catch (error: any) {
    console.error('Error in GET /api/modules/office-supplies/items:', error);
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
      category_id,
      name,
      description,
      unit = 'adet',
      estimated_unit_cost,
      supplier
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Item name is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from('office_supplies_items')
      .insert([{
        category_id,
        name,
        description,
        unit,
        estimated_unit_cost,
        supplier,
        is_active: true
      }])
      .select(`
        *,
        category:office_supplies_categories(id, name)
      `)
      .single();

    if (error) {
      console.error('Error creating office supplies item:', error);
      return NextResponse.json(
        { error: 'Failed to create item', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      item: data
    });

  } catch (error: any) {
    console.error('Error in POST /api/modules/office-supplies/items:', error);
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
      category_id,
      name,
      description,
      unit,
      estimated_unit_cost,
      supplier,
      is_active
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (category_id !== undefined) updateData.category_id = category_id;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (unit !== undefined) updateData.unit = unit;
    if (estimated_unit_cost !== undefined) updateData.estimated_unit_cost = estimated_unit_cost;
    if (supplier !== undefined) updateData.supplier = supplier;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabaseServer
      .from('office_supplies_items')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        category:office_supplies_categories(id, name)
      `)
      .single();

    if (error) {
      console.error('Error updating office supplies item:', error);
      return NextResponse.json(
        { error: 'Failed to update item', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      item: data
    });

  } catch (error: any) {
    console.error('Error in PUT /api/modules/office-supplies/items:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
