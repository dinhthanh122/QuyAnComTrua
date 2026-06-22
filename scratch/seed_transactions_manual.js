import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomElements(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function seed() {
  console.log('Fetching members...');
  const { data: members, error: fetchError } = await supabase.from('members').select('*');
  
  if (fetchError || !members || members.length < 5) return;

  // Track balances locally
  const balances = {};
  members.forEach(m => balances[m.id] = m.balance || 0);

  // 1. Generate 5 Fund transactions
  for (let i = 0; i < 5; i++) {
    const member = getRandomElement(members);
    const type = Math.random() > 0.5 ? 'NAP_QUY' : 'RUT_QUY';
    const amount = (Math.floor(Math.random() * 5) + 1) * 100000;

    await supabase.from('fund_transactions').insert([{ user_id: member.id, amount, type }]);
    
    if (type === 'NAP_QUY') balances[member.id] += amount;
    else balances[member.id] -= amount;
  }

  // 2. Generate 10 Expenses
  for (let i = 0; i < 10; i++) {
    const payer = getRandomElement(members);
    const numParticipants = Math.floor(Math.random() * 5) + 3;
    const participants = getRandomElements(members, numParticipants).map(m => m.id);
    if (!participants.includes(payer.id)) participants[0] = payer.id;

    const totalAmount = numParticipants * 40000;
    const amountPerPerson = totalAmount / participants.length;
    const description = `Ăn trưa ${getRandomElement(['Phở', 'Bún chả', 'Cơm rang', 'Bún bò', 'KFC'])}`;

    const { data: expData, error: expError } = await supabase
      .from('expenses')
      .insert([{ payer_id: payer.id, total_amount: totalAmount, description }])
      .select()
      .single();

    if (expError) continue;

    const splits = participants.map(pid => ({
      expense_id: expData.id,
      user_id: pid,
      amount: amountPerPerson
    }));

    await supabase.from('expense_splits').insert(splits);

    // Update local balances
    balances[payer.id] += totalAmount;
    participants.forEach(pid => balances[pid] -= amountPerPerson);
  }

  // 3. Update all members' balances in DB
  for (const [id, bal] of Object.entries(balances)) {
    await supabase.from('members').update({ balance: bal }).eq('id', id);
  }

  console.log('Successfully seeded transactions manually!');
}

seed();
