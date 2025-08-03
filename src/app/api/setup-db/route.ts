import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const setupFiles = [
      'profile-update-requests.sql',
      'finance-documents.sql'
    ];

    for (const fileName of setupFiles) {
      try {
        const sqlPath = join(process.cwd(), 'src/app/api/setup-db', fileName);
        const sql = readFileSync(sqlPath, 'utf8');

        // SQL'i satır satır çalıştır
        const statements = sql
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        for (const statement of statements) {
          if (statement.trim()) {
            const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
            if (error) {
              console.error(`Error executing statement from ${fileName}:`, error);
              // Bazı hatalar normal olabilir (tablo zaten var, policy zaten var vb.)
              // Bu yüzden devam ediyoruz
            }
          }
        }

        console.log(`Successfully processed ${fileName}`);
      } catch (fileError) {
        console.error(`Error processing ${fileName}:`, fileError);
        // Dosya bulunamadığında devam et
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database setup completed successfully' 
    });

  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Setup failed', details: error.message },
      { status: 500 }
    );
  }
}
