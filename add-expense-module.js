const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read environment variables from .env.local
let envVars = {};
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });
} catch (error) {
  console.error('Could not read .env.local file');
  process.exit(1);
}

const supabaseAdmin = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function addExpenseModule() {
  try {
    console.log('Adding expense entry module...');

    // Insert the module
    const { data, error } = await supabaseAdmin
      .from('modules')
      .insert({
        name: 'Masraf Girişi',
        description: 'Personel masraf girişleri ve onay süreçleri',
        icon: 'Receipt',
        is_active: true,
        settings: {
          route: 'expense-entry',
          features: ['create', 'edit', 'approve', 'reject', 'view']
        }
      });

    if (error) {
      console.error('Error adding module:', error);
      return;
    }

    console.log('✅ Expense entry module added successfully!');
    console.log('Module data:', data);

  } catch (error) {
    console.error('Error:', error);
  }
}

addExpenseModule();
