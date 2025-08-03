import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    // Get authorization header
    const authorization = request.headers.get('authorization');
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create client with service role for bypassing RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Extract token from authorization header
    const token = authorization.replace('Bearer ', '');
    
    // Verify the user token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      amount,
      currency,
      category,
      vendor,
      receipt_number,
      expense_date
    } = body;

    // Validate required fields
    if (!title || !amount) {
      return NextResponse.json({ error: 'Title and amount are required' }, { status: 400 });
    }

    // Insert expense
    const { data, error } = await supabase
      .from('task_expenses')
      .insert([{
        task_id: params.taskId,
        title: title.trim(),
        description: description?.trim() || null,
        amount: parseFloat(amount),
        currency: currency || 'TRY',
        category: category || 'material',
        vendor: vendor?.trim() || null,
        receipt_number: receipt_number?.trim() || null,
        expense_date: expense_date || new Date().toISOString().split('T')[0],
        created_by: user.id
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating expense:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    // Get authorization header
    const authorization = request.headers.get('authorization');
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create client with service role for bypassing RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Extract token from authorization header
    const token = authorization.replace('Bearer ', '');
    
    // Verify the user token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Fetch expenses
    const { data, error } = await supabase
      .from('task_expenses')
      .select(`
        *,
        creator:user_profiles!task_expenses_created_by_fkey(id, first_name, last_name),
        approver:user_profiles!task_expenses_approved_by_fkey(id, first_name, last_name)
      `)
      .eq('task_id', params.taskId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching expenses:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
