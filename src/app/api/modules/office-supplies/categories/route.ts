import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseServer
      .from('office_supplies_categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching office supplies categories:', error);
      return NextResponse.json(
        { error: 'Failed to fetch categories', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      categories: data || []
    });

  } catch (error: any) {
    console.error('Error in GET /api/modules/office-supplies/categories:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from('office_supplies_categories')
      .insert([{
        name,
        description,
        is_active: true
      }])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating office supplies category:', error);
      return NextResponse.json(
        { error: 'Failed to create category', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      category: data
    });

  } catch (error: any) {
    console.error('Error in POST /api/modules/office-supplies/categories:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
