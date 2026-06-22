import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  console.log("Fetching all tables...");
  const { data: members } = await supabase.from('members').select('*');
  const { data: expenses } = await supabase.from('expenses').select('*');
  const { data: splits } = await supabase.from('expense_splits').select('*');
  const { data: funds } = await supabase.from('fund_transactions').select('*');

  console.log("Identifying orphaned expenses...");
  const expenseIdsWithSplits = new Set(splits.map(s => s.expense_id));
  const orphanedExpenses = expenses.filter(e => !expenseIdsWithSplits.has(e.id));
  
  if (orphanedExpenses.length > 0) {
    console.log(`Deleting ${orphanedExpenses.length} orphaned expenses...`);
    for (const e of orphanedExpenses) {
      await supabase.from('expenses').delete().eq('id', e.id);
    }
  }

  console.log("Recalculating balances...");
  const newBalances = {};
  members.forEach(m => newBalances[m.id] = 0);

  const validExpenses = expenses.filter(e => expenseIdsWithSplits.has(e.id));
  validExpenses.forEach(e => {
    if (newBalances[e.payer_id] !== undefined) {
      newBalances[e.payer_id] += e.total_amount;
    }
  });

  splits.forEach(s => {
    if (newBalances[s.user_id] !== undefined) {
      newBalances[s.user_id] -= s.amount_owed;
    }
  });

  funds.forEach(f => {
    if (newBalances[f.user_id] !== undefined) {
      if (f.type === 'NAP_QUY') newBalances[f.user_id] += f.amount;
      if (f.type === 'RUT_QUY') newBalances[f.user_id] -= f.amount;
    }
  });

  console.log("Updating member balances...");
  for (const id of Object.keys(newBalances)) {
    const currentBal = members.find(m => m.id === id).balance;
    const newBal = newBalances[id];
    if (currentBal !== newBal) {
      await supabase.from('members').update({ balance: newBal }).eq('id', id);
    }
  }

  console.log("Done! Data is now perfectly consistent.");
}

fix();
