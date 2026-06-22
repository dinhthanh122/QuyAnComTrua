import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: members } = await supabase.from('members').select('id, name, balance');
  const { data: expenses } = await supabase.from('expenses').select('*');
  const { data: splits } = await supabase.from('expense_splits').select('*');
  const { data: funds } = await supabase.from('fund_transactions').select('*');

  console.log(`Members: ${members?.length}`);
  console.log(`Expenses: ${expenses?.length}`);
  console.log(`Expense Splits: ${splits?.length}`);
  console.log(`Fund Transactions: ${funds?.length}`);
}

check();
