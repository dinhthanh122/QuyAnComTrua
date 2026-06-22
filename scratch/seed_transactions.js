import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomElements(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function seedTransactions() {
  console.log('Fetching members...');
  const { data: members, error: fetchError } = await supabase.from('members').select('id, name');
  
  if (fetchError || !members || members.length < 5) {
    console.error('Cannot fetch members or not enough members:', fetchError);
    return;
  }

  console.log(`Found ${members.length} members. Generating 15 random expenses and 5 fund transactions...`);

  // Generate 15 expenses (Báo cơm)
  for (let i = 0; i < 15; i++) {
    const payer = getRandomElement(members);
    const numParticipants = Math.floor(Math.random() * 10) + 3; // 3 to 12 participants
    const participants = getRandomElements(members, numParticipants).map(m => m.id);
    
    // Ensure payer is in participants (most common scenario)
    if (!participants.includes(payer.id)) {
      participants[0] = payer.id;
    }

    const totalAmount = numParticipants * 40000; // e.g. 40k per person
    const description = `Ăn trưa quán ${getRandomElement(['Phở', 'Bún chả', 'Cơm rang', 'Bún bò', 'Bún đậu', 'KFC', 'Pizza'])} ngày ${Math.floor(Math.random() * 28) + 1}/${Math.floor(Math.random() * 6) + 1}`;

    const amountPerPerson = totalAmount / participants.length;

    const { error: expError } = await supabase.rpc('add_expense_transaction', {
      p_payer_id: payer.id,
      p_total_amount: totalAmount,
      p_description: description,
      p_participants: participants,
      p_amount_per_person: amountPerPerson
    });

    if (expError) console.error('Error adding expense:', expError);
  }

  // Generate 5 Fund transactions (Nạp / Rút)
  for (let i = 0; i < 5; i++) {
    const member = getRandomElement(members);
    const type = Math.random() > 0.5 ? 'NAP_QUY' : 'RUT_QUY';
    const amount = (Math.floor(Math.random() * 5) + 1) * 100000; // 100k - 500k

    const { error: fundError } = await supabase.rpc('handle_fund_transaction', {
      p_user_id: member.id,
      p_amount: amount,
      p_type: type
    });

    if (fundError) console.error('Error adding fund transaction:', fundError);
  }

  console.log('Successfully added mock transactions!');
}

seedTransactions();
