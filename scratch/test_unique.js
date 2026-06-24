import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data: exp } = await supabase.from('expenses').select('id').limit(1).single();
  const { data: mem } = await supabase.from('members').select('id').limit(1).single();
  
  if (!exp || !mem) return console.log('No data');

  console.log(`Testing with exp: ${exp.id}, mem: ${mem.id}`);
  
  // Try inserting two rows
  const { data, error } = await supabase.from('expense_splits').insert([
    { expense_id: exp.id, user_id: mem.id, amount_owed: 10 },
    { expense_id: exp.id, user_id: mem.id, amount_owed: 20 }
  ]);
  
  console.log('Result error:', error);
  
  if (!error) {
    // cleanup
    await supabase.from('expense_splits').delete().eq('expense_id', exp.id).eq('amount_owed', 10);
    await supabase.from('expense_splits').delete().eq('expense_id', exp.id).eq('amount_owed', 20);
    console.log('Cleaned up. No unique constraint!');
  }
}
test();
