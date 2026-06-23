const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function reset() {
  const { data, error } = await supabase
    .from('members')
    .update({ balance: 0 })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy condition to update all

  if (error) console.error("Error:", error);
  else console.log("Success reset!");
}

reset();
