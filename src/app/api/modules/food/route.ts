import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('daily_menu')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching menu data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch menu data', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      menus: data || []
    });

  } catch (error: any) {
    console.error('Error in GET /api/modules/food:', error);
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
      date,
      soup,
      main_course,
      side_dish,
      extra,
      extra_type = 'dessert'
    } = body;

    // Validate required fields
    if (!date || !main_course) {
      return NextResponse.json(
        { error: 'Date and main course are required' },
        { status: 400 }
      );
    }

    // Insert new menu
    const { data, error } = await supabase
      .from('daily_menu')
      .insert([{
        date,
        soup,
        main_course,
        side_dish,
        extra,
        extra_type
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating menu:', error);
      return NextResponse.json(
        { error: 'Failed to create menu', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      menu: data
    });

  } catch (error: any) {
    console.error('Error in POST /api/modules/food:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
