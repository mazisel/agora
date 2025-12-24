import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { authenticateUser, isAdmin } from '@/lib/auth-helper';

export async function GET(request: NextRequest) {
  try {
    // Authentication kontrolü
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin yetkisi kontrolü
    const userIsAdmin = await isAdmin(authResult.user.id);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const supabase = supabaseServer;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const accountType = searchParams.get('type');
    const parentId = searchParams.get('parent_id');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    // Build query
    let query = supabase
      .from('finance_accounts')
      .select('*')
      .order('code');

    if (accountType) {
      query = query.eq('account_type', accountType);
    }

    if (parentId) {
      query = query.eq('parent_account_id', parentId);
    } else if (parentId === null) {
      query = query.is('parent_account_id', null);
    }

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: accounts, error } = await query;

    if (error) {
      console.error('Error fetching finance accounts:', error);
      return NextResponse.json({
        error: 'Failed to fetch accounts',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({ accounts: accounts || [] });

  } catch (error) {
    console.error('Error in finance accounts GET:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication kontrolü
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin yetkisi kontrolü
    const userIsAdmin = await isAdmin(authResult.user.id);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const supabase = supabaseServer;

    const body = await request.json();
    const { code, name, description, account_type, parent_account_id } = body;

    // Validate required fields
    if (!code || !name || !account_type) {
      return NextResponse.json({
        error: 'Code, name, and account type are required'
      }, { status: 400 });
    }

    // Validate account type
    const validTypes = ['asset', 'liability', 'equity', 'income', 'expense'];
    if (!validTypes.includes(account_type)) {
      return NextResponse.json({
        error: 'Invalid account type'
      }, { status: 400 });
    }

    // Check if code already exists
    const { data: existingAccount } = await supabase
      .from('finance_accounts')
      .select('id')
      .eq('code', code)
      .single();

    if (existingAccount) {
      return NextResponse.json({
        error: 'Account code already exists'
      }, { status: 400 });
    }

    // If parent_account_id is provided, validate it exists
    if (parent_account_id) {
      const { data: parentAccount } = await supabase
        .from('finance_accounts')
        .select('id, account_type')
        .eq('id', parent_account_id)
        .single();

      if (!parentAccount) {
        return NextResponse.json({
          error: 'Parent account not found'
        }, { status: 400 });
      }

      // Validate that parent and child have same account type
      if (parentAccount.account_type !== account_type) {
        return NextResponse.json({
          error: 'Child account must have same type as parent account'
        }, { status: 400 });
      }
    }

    // Create new account
    const { data: newAccount, error } = await supabase
      .from('finance_accounts')
      .insert({
        code,
        name,
        description,
        account_type,
        parent_account_id: parent_account_id || null,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating finance account:', error);
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    return NextResponse.json({ account: newAccount }, { status: 201 });

  } catch (error) {
    console.error('Error in finance accounts POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authentication kontrolü
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin yetkisi kontrolü
    const userIsAdmin = await isAdmin(authResult.user.id);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const supabase = supabaseServer;

    const body = await request.json();
    const { id, code, name, description, account_type, parent_account_id, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Check if account exists
    const { data: existingAccount } = await supabase
      .from('finance_accounts')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingAccount) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // If code is being changed, check for duplicates
    if (code && code !== existingAccount.code) {
      const { data: duplicateAccount } = await supabase
        .from('finance_accounts')
        .select('id')
        .eq('code', code)
        .neq('id', id)
        .single();

      if (duplicateAccount) {
        return NextResponse.json({
          error: 'Account code already exists'
        }, { status: 400 });
      }
    }

    // Validate account type if provided
    if (account_type) {
      const validTypes = ['asset', 'liability', 'equity', 'income', 'expense'];
      if (!validTypes.includes(account_type)) {
        return NextResponse.json({
          error: 'Invalid account type'
        }, { status: 400 });
      }
    }

    // If parent_account_id is being changed, validate it
    if (parent_account_id !== undefined && parent_account_id !== existingAccount.parent_account_id) {
      if (parent_account_id) {
        const { data: parentAccount } = await supabase
          .from('finance_accounts')
          .select('id, account_type')
          .eq('id', parent_account_id)
          .single();

        if (!parentAccount) {
          return NextResponse.json({
            error: 'Parent account not found'
          }, { status: 400 });
        }

        // Validate that parent and child have same account type
        const finalAccountType = account_type || existingAccount.account_type;
        if (parentAccount.account_type !== finalAccountType) {
          return NextResponse.json({
            error: 'Child account must have same type as parent account'
          }, { status: 400 });
        }

        // Prevent circular reference
        if (parent_account_id === id) {
          return NextResponse.json({
            error: 'Account cannot be its own parent'
          }, { status: 400 });
        }
      }
    }

    // Update account
    const updateData: any = { updated_at: new Date().toISOString() };

    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (account_type !== undefined) updateData.account_type = account_type;
    if (parent_account_id !== undefined) updateData.parent_account_id = parent_account_id;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedAccount, error } = await supabase
      .from('finance_accounts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating finance account:', error);
      return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
    }

    return NextResponse.json({ account: updatedAccount });

  } catch (error) {
    console.error('Error in finance accounts PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authentication kontrolü
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin yetkisi kontrolü
    const userIsAdmin = await isAdmin(authResult.user.id);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const supabase = supabaseServer;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Check if account exists
    const { data: existingAccount } = await supabase
      .from('finance_accounts')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingAccount) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check if account has child accounts
    const { data: childAccounts } = await supabase
      .from('finance_accounts')
      .select('id')
      .eq('parent_account_id', id);

    if (childAccounts && childAccounts.length > 0) {
      return NextResponse.json({
        error: 'Alt hesapları olan hesap silinemez'
      }, { status: 400 });
    }

    // Check if account has transactions
    const { data: transactions } = await supabase
      .from('finance_transactions')
      .select('id')
      .eq('account_id', id)
      .limit(1);

    if (transactions && transactions.length > 0) {
      return NextResponse.json({
        error: 'İşlem geçmişi olan hesap silinemez'
      }, { status: 400 });
    }

    // Delete account
    const { error } = await supabase
      .from('finance_accounts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting finance account:', error);
      return NextResponse.json({
        error: 'Hesap silinirken hata oluştu',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({ message: 'Hesap başarıyla silindi' });

  } catch (error) {
    console.error('Error in finance accounts DELETE:', error);
    return NextResponse.json({
      error: 'Sunucu hatası',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    }, { status: 500 });
  }
}
