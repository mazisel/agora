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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const expenseId = formData.get('expenseId') as string;
    const userId = formData.get('userId') as string;

    if (!file || !expenseId || !userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'File, expense ID, and user ID are required' 
      }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid file type. Only JPEG, PNG, GIF, WebP, and PDF files are allowed.' 
      }, { status: 400 });
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        success: false, 
        error: 'File size too large. Maximum size is 10MB.' 
      }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${userId}/${expenseId}/${timestamp}.${fileExtension}`;

    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('expense-attachments')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to upload file' 
      }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('expense-attachments')
      .getPublicUrl(fileName);

    // Save attachment record to database
    const { data: attachment, error: dbError } = await supabaseAdmin
      .from('expense_attachments')
      .insert({
        expense_id: expenseId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Clean up uploaded file if database insert fails
      await supabaseAdmin.storage
        .from('expense-attachments')
        .remove([fileName]);
      
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to save attachment record' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      attachment
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('id');

    if (!attachmentId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Attachment ID is required' 
      }, { status: 400 });
    }

    // Get attachment record
    const { data: attachment, error: fetchError } = await supabaseAdmin
      .from('expense_attachments')
      .select('*')
      .eq('id', attachmentId)
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json({ 
        success: false, 
        error: 'Attachment not found' 
      }, { status: 404 });
    }

    // Extract file path from URL
    const urlParts = attachment.file_url.split('/');
    const fileName = urlParts.slice(-3).join('/'); // Get userId/expenseId/filename.ext

    // Delete from storage
    const { error: storageError } = await supabaseAdmin.storage
      .from('expense-attachments')
      .remove([fileName]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabaseAdmin
      .from('expense_attachments')
      .delete()
      .eq('id', attachmentId);

    if (dbError) {
      console.error('Database delete error:', dbError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete attachment record' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Attachment deleted successfully'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
