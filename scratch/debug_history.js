import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugHistory() {
  console.log("Fetching expenses order by date...");
  const res1 = await supabase.from('expenses').select('*').order('date', { ascending: false });
  console.log("Expenses order by date error:", res1.error);
  console.log("Expenses count:", res1.data?.length);
  
  if (res1.error) {
     console.log("Falling back to created_at");
     const res2 = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
     console.log("Expenses order by created_at error:", res2.error);
     console.log("Expenses count:", res2.data?.length);
  }

  console.log("Fetching funds order by created_at...");
  const res3 = await supabase.from('fund_transactions').select('*').order('created_at', { ascending: false });
  console.log("Funds error:", res3.error);
  console.log("Funds count:", res3.data?.length);
}

debugHistory();
