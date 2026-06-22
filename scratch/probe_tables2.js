import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vudxzypxmzxqcfjzegzi.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1ZHh6eXB4bXp4cWNmanplZ3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MzI5NjYsImV4cCI6MjA5NzQwODk2Nn0.XtbqDfH7fJKtoRFJIiT7YdoLUQFOvON0BJf6i9t99Oc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAll() {
  const tables = ['members', 'expenses', 'transactions', 'expense_participants', 'fund_transactions', 'history'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table ${t}: ERROR ${error.message}`);
    } else {
      console.log(`Table ${t}: EXISTS`);
    }
  }
}

checkAll();
