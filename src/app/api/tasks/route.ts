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

    // Kullanıcının profil bilgilerini al
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('authority_level, first_name, last_name, personnel_number')
      .eq('id', user.id)
      .single();

    // Normal görevleri getir
    let tasksQuery = supabase
      .from('tasks')
      .select(`
        *,
        project:projects(id, name),
        assignee:user_profiles!tasks_assigned_to_fkey(id, first_name, last_name, personnel_number),
        assigner:user_profiles!tasks_assigned_by_fkey(id, first_name, last_name, personnel_number),
        informed:user_profiles!tasks_informed_person_fkey(id, first_name, last_name, personnel_number),
        creator:user_profiles!tasks_created_by_fkey(id, first_name, last_name, personnel_number)
      `);

    // Admin kullanıcılar tüm görevleri görebilir, diğer kullanıcılar sadece kendi görevlerini
    if (userProfile && userProfile.authority_level !== 'admin') {
      tasksQuery = tasksQuery.or(`assigned_to.eq.${user.id},created_by.eq.${user.id},informed_person.eq.${user.id}`);
    }

    const { data: tasks, error: tasksError } = await tasksQuery
      .order('created_at', { ascending: false });

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      // Normal görevler yoksa boş array kullan, diğer talepleri getirmeye devam et
    }


    // İzin taleplerini görev formatında getir
    let leaveRequestsQuery = supabase
      .from('leave_requests')
      .select(`
        *,
        user_profiles!leave_requests_user_profiles_fkey(id, first_name, last_name, personnel_number),
        assigned_user:user_profiles!leave_requests_assigned_to_fkey(id, first_name, last_name, personnel_number)
      `);

    // Admin değilse sadece atanmış izin taleplerini getir
    if (userProfile && userProfile.authority_level !== 'admin') {
      leaveRequestsQuery = leaveRequestsQuery.eq('assigned_to', user.id);
    }

    const { data: leaveRequests, error: leaveError } = await leaveRequestsQuery
      .order('created_at', { ascending: false });

    if (leaveError) {
      console.error('Error fetching leave requests:', leaveError);
    }

    // İzin taleplerini görev formatına dönüştür
    const leaveRequestTasks = (leaveRequests || []).map(request => ({
      id: `leave_${request.id}`,
      title: `İzin Talebi - ${request.user_profiles?.first_name} ${request.user_profiles?.last_name}`,
      description: `${request.leave_type === 'annual' ? 'Yıllık İzin' : 
                   request.leave_type === 'sick' ? 'Hastalık İzni' : 
                   request.leave_type === 'personal' ? 'Kişisel İzin' : 
                   request.leave_type === 'maternity' ? 'Doğum İzni' : 'İzin'} - ${new Date(request.start_date).toLocaleDateString('tr-TR')} / ${new Date(request.end_date).toLocaleDateString('tr-TR')}${request.reason ? ` - ${request.reason}` : ''}`,
      status: request.status === 'pending' ? 'todo' : 
              request.status === 'approved' ? 'done' : 'cancelled',
      priority: 'medium',
      created_at: request.created_at,
      updated_at: request.updated_at,
      due_date: request.end_date,
      project: { id: 'leave', name: 'İzin Yönetimi' },
      assignee: request.assigned_user || {
        id: 'unknown',
        first_name: 'Atanmamış',
        last_name: '',
        personnel_number: ''
      },
      creator: request.user_profiles,
      task_type: 'leave_request',
      original_data: request
    }));

    // Avans taleplerini görev formatında getir
    let advanceRequestsQuery = supabase
      .from('advance_requests')
      .select(`
        *,
        user_profiles!advance_requests_user_profiles_fkey(id, first_name, last_name, personnel_number),
        assigned_user:user_profiles!advance_requests_assigned_to_fkey(id, first_name, last_name, personnel_number)
      `);

    // Admin değilse sadece atanmış avans taleplerini getir
    if (userProfile && userProfile.authority_level !== 'admin') {
      advanceRequestsQuery = advanceRequestsQuery.eq('assigned_to', user.id);
    }

    const { data: advanceRequests, error: advanceError } = await advanceRequestsQuery
      .order('created_at', { ascending: false });

    if (advanceError) {
      console.error('Error fetching advance requests:', advanceError);
    }

    // Avans taleplerini görev formatına dönüştür
    const advanceRequestTasks = (advanceRequests || []).map(request => ({
      id: `advance_${request.id}`,
      title: `Avans Talebi - ${request.user_profiles?.first_name} ${request.user_profiles?.last_name}`,
      description: `${request.amount} ${request.currency} - ${request.reason}`,
      status: request.status === 'pending' ? 'todo' : 
              request.status === 'approved' ? 'done' : 'cancelled',
      priority: 'high',
      created_at: request.created_at,
      updated_at: request.updated_at,
      project: { id: 'advance', name: 'Avans Yönetimi' },
      assignee: request.assigned_user || {
        id: 'unknown',
        first_name: 'Atanmamış',
        last_name: '',
        personnel_number: ''
      },
      creator: request.user_profiles,
      task_type: 'advance_request',
      original_data: request
    }));

    // Öneri/şikayet taleplerini görev formatında getir
    let suggestionsQuery = supabase
      .from('suggestions')
      .select(`
        *,
        user_profiles!suggestions_user_profiles_fkey(id, first_name, last_name, personnel_number),
        assigned_user:user_profiles!suggestions_assigned_to_fkey(id, first_name, last_name, personnel_number)
      `);

    // Admin değilse sadece atanmış öneri/şikayetleri getir
    if (userProfile && userProfile.authority_level !== 'admin') {
      suggestionsQuery = suggestionsQuery.eq('assigned_to', user.id);
    }

    const { data: suggestions, error: suggestionsError } = await suggestionsQuery
      .order('created_at', { ascending: false });

    if (suggestionsError) {
      console.error('Error fetching suggestions:', suggestionsError);
    }

    // Öneri/şikayetleri görev formatına dönüştür
    const suggestionTasks = (suggestions || []).map(suggestion => ({
      id: `suggestion_${suggestion.id}`,
      title: `${suggestion.type === 'suggestion' ? 'Öneri' : 'Şikayet'} - ${suggestion.subject}`,
      description: suggestion.description,
      status: suggestion.status === 'pending' ? 'todo' : 
              suggestion.status === 'reviewed' ? 'review' :
              suggestion.status === 'implemented' ? 'done' : 'cancelled',
      priority: suggestion.type === 'complaint' ? 'high' : 'medium',
      created_at: suggestion.created_at,
      updated_at: suggestion.updated_at,
      project: { id: 'suggestion', name: 'Öneri/Şikayet Yönetimi' },
      assignee: suggestion.assigned_user || {
        id: 'unknown',
        first_name: 'Atanmamış',
        last_name: '',
        personnel_number: ''
      },
      creator: suggestion.anonymous ? null : suggestion.user_profiles,
      task_type: 'suggestion',
      original_data: suggestion
    }));

    // Tüm görevleri birleştir ve sırala
    const allTasks = [
      ...(tasks || []),
      ...leaveRequestTasks,
      ...advanceRequestTasks,
      ...suggestionTasks
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json(allTasks);

  } catch (error: any) {
    console.error('Tasks API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
