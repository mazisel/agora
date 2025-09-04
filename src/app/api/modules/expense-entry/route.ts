import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID is required' 
      }, { status: 400 });
    }

    const { data: expenses, error } = await supabaseAdmin
      .from('expense_entries')
      .select(`
        *,
        category:expense_categories(id, name),
        attachments:expense_attachments!expense_id(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Expenses error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      expenses: expenses || []
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      category_id,
      title,
      description,
      amount,
      expense_date,
      department,
      project_code,
      vendor_name,
      payment_method,
      currency,
      receipt_url
    } = body;

    if (!user_id || !category_id || !title || !amount || !expense_date) {
      return NextResponse.json({ 
        success: false, 
        error: 'Required fields are missing' 
      }, { status: 400 });
    }

    const { data: expense, error } = await supabaseAdmin
      .from('expense_entries')
      .insert({
        user_id,
        category_id,
        title,
        description,
        amount: parseFloat(amount),
        expense_date,
        department,
        project_code,
        vendor_name,
        payment_method: payment_method || 'cash',
        currency: currency || 'TRY',
        receipt_url,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Create expense error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      expense
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      category_id,
      title,
      description,
      amount,
      expense_date,
      department,
      project_code,
      vendor_name,
      payment_method,
      currency,
      receipt_url
    } = body;

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Expense ID is required' 
      }, { status: 400 });
    }

    const { data: expense, error } = await supabaseAdmin
      .from('expense_entries')
      .update({
        category_id,
        title,
        description,
        amount: parseFloat(amount),
        expense_date,
        department,
        project_code,
        vendor_name,
        payment_method,
        currency,
        receipt_url
      })
      .eq('id', id)
      .eq('status', 'pending') // Only allow updates for pending expenses
      .select()
      .single();

    if (error) {
      console.error('Update expense error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      expense
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
