import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function probe() {
  const { data, error } = await supabase.from('members').select('*');
  console.log("Error:", error);
  console.log("Data length:", data?.length);
  console.log("Data:", data);
}

probe();
