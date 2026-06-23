const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Read from .env.local
const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function check() {
  const { data: members } = await supabase.from('members').select('id, name, balance');
  const { data: expenses } = await supabase.from('expenses').select('*');
  const { data: splits } = await supabase.from('expense_splits').select('*');
  const { data: funds } = await supabase.from('fund_transactions').select('*');

  console.log("MEMBERS:", members);
  console.log("EXPENSES:", expenses);
  console.log("SPLITS:", splits);
  console.log("FUNDS:", funds);
}

check();
