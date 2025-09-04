import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, icon, is_active = true, settings = {} } = body;

    // Validate required fields
    if (!name || !description || !icon) {
      return NextResponse.json(
        { error: 'Name, description, and icon are required' },
        { status: 400 }
      );
    }

    // Check if module already exists
    const { data: existingModule, error: checkError } = await supabase
      .from('modules')
      .select('id')
      .eq('name', name)
      .single();

    if (existingModule) {
      return NextResponse.json(
        { error: 'Module with this name already exists' },
        { status: 409 }
      );
    }

    // Insert new module
    const { data, error } = await supabase
      .from('modules')
      .insert([{
        name,
        description,
        icon,
        is_active,
        settings
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating module:', error);
      return NextResponse.json(
        { error: 'Failed to create module', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      module: data
    });

  } catch (error: any) {
    console.error('Error in POST /api/admin/modules:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('modules')
      .select(`
        *,
        assigned_user:user_profiles!modules_assigned_to_fkey(
          id,
          first_name,
          last_name,
          personnel_number
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching modules:', error);
      return NextResponse.json(
        { error: 'Failed to fetch modules', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      modules: data || []
    });

  } catch (error: any) {
    console.error('Error in GET /api/admin/modules:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
