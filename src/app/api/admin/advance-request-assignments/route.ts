import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Kullanıcının yetki seviyesini kontrol et
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('authority_level')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error checking user profile:', profileError);
      return NextResponse.json({ error: 'Failed to check user profile' }, { status: 500 });
    }

    // Admin, manager, team_lead, director yetkisi varsa genel yetki ver
    const hasGeneralAuthority = userProfile && [
      'admin', 
      'manager', 
      'team_lead', 
      'director'
    ].includes(userProfile.authority_level);

    if (hasGeneralAuthority) {
      return NextResponse.json({
        hasAssignments: true,
        assignmentCount: -1, // Genel yetki göstergesi
        authorityType: 'general'
      });
    }

    // Avans kategorisinde support agent mi kontrol et
    const { data: supportAgents, error: agentError } = await supabase
      .from('support_agents')
      .select(`
        category_id,
        support_categories!inner(name)
      `)
      .eq('user_id', user.id);

    if (agentError) {
      console.error('Error checking support agents:', agentError);
      return NextResponse.json({ error: 'Failed to check support agents' }, { status: 500 });
    }

    // Avans kategorisinde yetkili mi kontrol et
    const hasAdvanceCategory = supportAgents && supportAgents.some((agent: any) => 
      agent.support_categories.name === 'Avans Talebi'
    );

    return NextResponse.json({
      hasAssignments: hasAdvanceCategory,
      assignmentCount: hasAdvanceCategory ? 1 : 0,
      authorityType: hasAdvanceCategory ? 'support_agent' : 'none'
    });

  } catch (error: any) {
    console.error('Advance assignments API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
