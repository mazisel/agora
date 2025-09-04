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
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = supabaseAdmin
      .from('expense_entries')
      .select(`
        *,
        category:expense_categories(id, name),
        attachments:expense_attachments!expense_id(*)
      `)
      .order('submitted_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (startDate) {
      query = query.gte('expense_date', startDate);
    }

    if (endDate) {
      query = query.lte('expense_date', endDate);
    }

    const { data: expenses, error } = await query;

    if (error) {
      console.error('Admin expenses error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    // Fetch user details for each expense
    const expensesWithUsers = await Promise.all(
      (expenses || []).map(async (expense) => {
        try {
          // Try to get user from user_profiles table
          const { data: userProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('id, email, first_name, last_name')
            .eq('id', expense.user_id)
            .single();

          return {
            ...expense,
            user: userProfile ? {
              id: userProfile.id,
              email: userProfile.email,
              raw_user_meta_data: {
                first_name: userProfile.first_name,
                last_name: userProfile.last_name
              }
            } : null
          };
        } catch (error) {
          console.error('Error fetching user for expense:', expense.id, error);
          return {
            ...expense,
            user: null
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      expenses: expensesWithUsers
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
      status,
      approved_by,
      rejection_reason,
      admin_notes,
      account_id
    } = body;

    if (!id || !status) {
      return NextResponse.json({ 
        success: false, 
        error: 'Expense ID and status are required' 
      }, { status: 400 });
    }

    if (status === 'approved' && !account_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Account selection is required for approval' 
      }, { status: 400 });
    }

    // Get expense details first
    const { data: expense, error: expenseError } = await supabaseAdmin
      .from('expense_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (expenseError || !expense) {
      return NextResponse.json({ 
        success: false, 
        error: 'Expense not found' 
      }, { status: 404 });
    }

    const updateData: any = {
      status,
      admin_notes
    };

    if (status === 'approved') {
      updateData.approved_by = approved_by;
      updateData.approved_at = new Date().toISOString();
      updateData.rejection_reason = null;
    } else if (status === 'rejected') {
      updateData.rejection_reason = rejection_reason;
      updateData.approved_by = null;
      updateData.approved_at = null;
    }

    // Update expense status
    const { data: updatedExpense, error: updateError } = await supabaseAdmin
      .from('expense_entries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update expense status error:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: updateError.message 
      }, { status: 500 });
    }

    // If approved, create finance transaction
    if (status === 'approved' && account_id) {
      try {
        // Get user name for the transaction
        const { data: userProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('first_name, last_name, email')
          .eq('id', expense.user_id)
          .single();

        const employeeName = userProfile 
          ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.email
          : 'Bilinmeyen Kullanıcı';

        // Create finance transaction
        const { error: financeError } = await supabaseAdmin
          .from('finance_transactions')
          .insert({
            type: 'expense',
            category: expense.category || 'Personel Masrafları',
            amount: expense.amount,
            description: `${expense.title} - ${expense.description || ''}`.trim(),
            date: expense.expense_date,
            employee_id: expense.user_id,
            employee_name: employeeName,
            payment_method: expense.payment_method || 'bank_transfer',
            reference_number: `EXP-${expense.id}`,
            account_id: account_id,
            created_by: approved_by
          });

        if (financeError) {
          console.error('Error creating finance transaction:', financeError);
          // Don't fail the whole operation, just log the error
        }
      } catch (financeError) {
        console.error('Error creating finance transaction:', financeError);
        // Don't fail the whole operation, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      expense: updatedExpense
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
