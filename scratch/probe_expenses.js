import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function probe() {
  const { data: exps, error: err1 } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
  console.log("Expenses order error:", err1);
  console.log("Expenses count:", exps?.length);
}

probe();
