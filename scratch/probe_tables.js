import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function probe() {
  const { data: exps, error: err1 } = await supabase.from('expenses').select('*');
  console.log("Expenses:", exps?.length, "Error:", err1);
  
  const { data: funds, error: err2 } = await supabase.from('fund_transactions').select('*');
  console.log("Funds:", funds?.length, "Error:", err2);
}

probe();
