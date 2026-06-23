'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { checkIsAdmin } from './auth';
import { sendEmail } from '@/lib/email';

export type TransactionHistory = {
  id: string;
  type: 'EXPENSE' | 'NAP_QUY' | 'RUT_QUY';
  actor_name: string;
  amount: number;
  description: string;
  created_at: string;
  participants?: string[];
  participant_ids?: string[];
  payer_id?: string;
};

export async function processFundTransaction(data: {
  user_id: string;
  amount: number;
  type: 'NAP_QUY' | 'RUT_QUY';
}) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    throw new Error('Chỉ quản lý mới có quyền thực hiện chức năng này.');
  }

  const { error } = await supabase.rpc('handle_fund_transaction', {
    p_user_id: data.user_id,
    p_amount: data.amount,
    p_type: data.type
  });

  if (error) {
    console.error('Error processing fund transaction:', error);
    throw new Error('Giao dịch thất bại: ' + error.message);
  }

  // Lấy thông tin user
  const { data: userData } = await supabase.from('members').select('name, email, receive_notifications').eq('id', data.user_id).single();
  const userName = userData?.name || 'Thành viên';
  
  const typeText = data.type === 'NAP_QUY' ? 'Nạp quỹ' : 'Rút quỹ';
  const content = `Admin vừa ghi nhận ${typeText} ${data.amount.toLocaleString()}đ cho ${userName}.`;

  // Chèn thông báo chung
  await supabase.from('notifications').insert([{
    title: `Giao dịch ${typeText}`,
    content,
    type: data.type
  }]);

  // Gửi email cho người được nạp/rút nếu họ bật nhận thông báo
  if (userData?.email && userData?.receive_notifications !== false) {
    await sendEmail({
      to: userData.email,
      subject: `[Quỹ Ăn Trưa] Thông báo ${typeText} thành công`,
      html: `
        <h3>Chào ${userName},</h3>
        <p>Hệ thống vừa ghi nhận giao dịch <strong>${typeText}</strong> với số tiền <strong>${data.amount.toLocaleString()}đ</strong> vào tài khoản quỹ của bạn.</p>
        <p>Vui lòng kiểm tra lại số dư trên hệ thống.</p>
      `
    });
  }

  revalidatePath('/');
}

export async function getTransactionHistory(): Promise<TransactionHistory[]> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return [];

  // Fetch all members to map IDs to names
  const { data: membersData, error: memError } = await supabase.from('members').select('id, name');
  const membersMap = new Map((membersData || []).map(m => [m.id, m.name]));

  const history: TransactionHistory[] = [];

  // Fetch expenses
  const { data: expenses, error: expError } = await supabase
    .from('expenses')
    .select('*');

  // Fetch expense splits
  const { data: splits } = await supabase.from('expense_splits').select('expense_id, user_id');
  const splitsMap = new Map<string, string[]>();
  const splitIdsMap = new Map<string, string[]>();
  
  if (splits) {
    for (const split of splits) {
      const name = membersMap.get(split.user_id);
      if (name) {
        if (!splitsMap.has(split.expense_id)) {
          splitsMap.set(split.expense_id, []);
          splitIdsMap.set(split.expense_id, []);
        }
        splitsMap.get(split.expense_id)!.push(name);
        splitIdsMap.get(split.expense_id)!.push(split.user_id);
      }
    }
  }

  if (expError) {
    console.error("Fetch expenses error:", expError);
  }

  if (expenses) {
    for (const exp of expenses) {
      history.push({
        id: exp.id,
        type: 'EXPENSE',
        actor_name: membersMap.get(exp.payer_id) || 'Unknown',
        amount: exp.total_amount,
        description: exp.description || 'Báo cơm',
        created_at: exp.created_at || exp.date || new Date().toISOString(),
        participants: splitsMap.get(exp.id) || [],
        participant_ids: splitIdsMap.get(exp.id) || [],
        payer_id: exp.payer_id,
      });
    }
  }

  // Fetch fund transactions
  const { data: funds, error: fundError } = await supabase
    .from('fund_transactions')
    .select('*');

  if (fundError) {
    console.error("Fetch funds error:", fundError);
  }

  if (funds) {
    for (const fund of funds) {
      history.push({
        id: fund.id,
        type: fund.type as 'NAP_QUY' | 'RUT_QUY',
        actor_name: membersMap.get(fund.user_id) || 'Unknown',
        amount: fund.amount,
        description: fund.type === 'NAP_QUY' ? 'Nạp tiền vào quỹ' : 'Rút tiền khỏi quỹ',
        created_at: fund.created_at || new Date().toISOString(),
      });
    }
  }

  // Sort by created_at descending
  history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return history;
}

export async function getFundStats() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // 1. Tổng quỹ: sum(balance)
  const { data: members } = await supabase.from('members').select('balance');
  const totalFund = members?.reduce((sum, m) => sum + (m.balance || 0), 0) || 0;
  
  // Tính tổng tiền cần thu (các số dư âm) và tổng tiền cần trả (các số dư dương)
  const totalReceivables = members?.reduce((sum, m) => sum + (m.balance < 0 ? m.balance : 0), 0) || 0;
  const totalPayables = members?.reduce((sum, m) => sum + (m.balance > 0 ? m.balance : 0), 0) || 0;

  // 2. Thu tháng này: sum(amount) from fund_transactions where type = 'NAP_QUY'
  const { data: incomes } = await supabase
    .from('fund_transactions')
    .select('amount')
    .eq('type', 'NAP_QUY')
    .gte('created_at', startOfMonth.toISOString());
  const incomeThisMonth = incomes?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

  // 3. Chi tháng này: sum(amount that others owe to the payer)
  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, total_amount, payer_id')
    .gte('date', startOfMonth.toISOString());
    
  let expenseThisMonth = 0;
  if (expenses) {
    const { data: splits } = await supabase.from('expense_splits').select('expense_id, user_id');
    for (const e of expenses) {
      const expSplits = splits?.filter(s => s.expense_id === e.id) || [];
      const count = expSplits.length;
      if (count > 0) {
        const perPerson = e.total_amount / count;
        const payerInSplits = expSplits.some(s => s.user_id === e.payer_id);
        const payerShare = payerInSplits ? perPerson : 0;
        expenseThisMonth += (e.total_amount - payerShare);
      }
    }
  }

  return {
    totalFund,
    incomeThisMonth,
    expenseThisMonth,
    totalReceivables,
    totalPayables
  };
}
