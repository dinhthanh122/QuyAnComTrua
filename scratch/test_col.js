import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function probe() {
  const { data, error } = await supabase.from('expense_splits').insert({ 
    expense_id: '00000000-0000-0000-0000-000000000000', 
    user_id: '00000000-0000-0000-0000-000000000000', 
    amount: 100 
  });
  console.log("Error inserting amount:", error?.message);
  
  const { error: err2 } = await supabase.from('expense_splits').insert({ 
    expense_id: '00000000-0000-0000-0000-000000000000', 
    user_id: '00000000-0000-0000-0000-000000000000', 
    amount_owed: 100 
  });
  console.log("Error inserting amount_owed:", err2?.message);
}

probe();
