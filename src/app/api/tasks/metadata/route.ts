import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Returns projects (ongoing) and active users for tasks page (avoids client-side CORS/RLS issues)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const parts = token.split('.');
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const [projectsRes, usersRes] = await Promise.all([
      supabaseAdmin
        .from('projects')
        .select('*')
        .eq('status', 'ongoing')
        .order('name'),
      supabaseAdmin
        .from('user_profiles')
        .select('id, first_name, last_name, personnel_number, position')
        .eq('status', 'active')
        .order('first_name'),
    ]);

    if (projectsRes.error) {
      console.error('Metadata fetch projects error:', projectsRes.error);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    if (usersRes.error) {
      console.error('Metadata fetch users error:', usersRes.error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json({ projects: projectsRes.data || [], users: usersRes.data || [] });
  } catch (error) {
    console.error('Metadata fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
