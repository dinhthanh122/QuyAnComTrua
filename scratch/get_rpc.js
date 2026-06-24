import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.rpc('run_sql', {
    query: `
      SELECT pg_get_functiondef(oid) 
      FROM pg_proc 
      WHERE proname = 'update_expense_transaction';
    `
  });
  console.log(error ? error : data);
}
main();
