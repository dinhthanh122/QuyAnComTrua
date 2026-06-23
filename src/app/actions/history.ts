'use server';

import { supabase } from '@/lib/supabase';
import { checkIsAdmin } from './auth';
import { getSystemConfig } from './system_settings';

export type MemberTransaction = {
  id: string;
  type: 'PAID' | 'PARTICIPATED' | 'NAP_QUY' | 'RUT_QUY' | 'SETTLED';
  amount: number;
  description: string;
  date: string;
  balance_change: number;
  payer_name?: string;
};

export async function verifyPinAndGetHistory(memberId: string, pinCode: string | null): Promise<MemberTransaction[]> {
  const isAdmin = await checkIsAdmin();
  const config = await getSystemConfig();
  const requirePin = config?.require_pin_for_history;

  // Nếu không phải admin và yêu cầu nhập mã PIN
  if (!isAdmin && requirePin) {
    if (!pinCode) throw new Error('Vui lòng nhập mã PIN');
    
    // Kiểm tra mã PIN
    const { data: member, error: memError } = await supabase
      .from('members')
      .select('pin_code')
      .eq('id', memberId)
      .single();

    if (memError) throw new Error('Thành viên không tồn tại');
    
    if (member.pin_code && member.pin_code !== pinCode) {
      throw new Error('Mã PIN không chính xác');
    }
  }

  // Lấy danh sách thành viên để map tên
  const { data: members } = await supabase.from('members').select('id, name');
  const membersMap = new Map((members || []).map(m => [m.id, m.name]));

  // Lấy lịch sử giao dịch
  const history: MemberTransaction[] = [];

  // 1. Lấy các bữa ăn đã thanh toán hộ (PAID) -> Tăng số dư (+)
  const { data: paidExpenses } = await supabase
    .from('expenses')
    .select('id, total_amount, description, created_at, date')
    .eq('payer_id', memberId);

  const paidMap = new Map();
  if (paidExpenses) {
    for (const exp of paidExpenses) {
      paidMap.set(exp.id, exp);
    }
  }

  // 2. Lấy các bữa ăn tham gia (PARTICIPATED) -> Giảm số dư (-)
  const { data: participations } = await supabase
    .from('expense_splits')
    .select('expense_id, amount_owed, expenses(description, created_at, date, payer_id)')
    .eq('user_id', memberId);

  if (participations) {
    for (const part of participations) {
      const exp = part.expenses as any;
      if (!exp) continue;

      if (paidMap.has(part.expense_id)) {
        // User paid and participated -> Combine into a single net positive (or 0) transaction
        const paidExp = paidMap.get(part.expense_id);
        const netAmount = paidExp.total_amount - part.amount_owed;
        history.push({
          id: paidExp.id,
          type: 'PAID',
          amount: netAmount,
          description: `Báo cơm (đã trừ phần mình): ${paidExp.description || 'Ăn trưa'}`,
          date: paidExp.created_at || paidExp.date,
          balance_change: netAmount,
          payer_name: 'Bạn'
        });
        paidMap.delete(part.expense_id);
      } else {
        // User participated but didn't pay
        history.push({
          id: part.expense_id + '_split',
          type: 'PARTICIPATED',
          amount: part.amount_owed,
          description: `Tham gia ăn: ${exp.description || 'Ăn trưa'}`,
          date: exp.created_at || exp.date,
          balance_change: -part.amount_owed,
          payer_name: membersMap.get(exp.payer_id)
        });
      }
    }
  }

  // Add remaining paidExpenses (user paid but didn't participate)
  for (const exp of paidMap.values()) {
    history.push({
      id: exp.id,
      type: 'PAID',
      amount: exp.total_amount,
      description: `Thanh toán hộ: ${exp.description || 'Ăn trưa'}`,
      date: exp.created_at || exp.date,
      balance_change: exp.total_amount,
      payer_name: 'Bạn'
    });
  }

  // 3. Lấy giao dịch Nạp/Rút quỹ
  const { data: funds } = await supabase
    .from('fund_transactions')
    .select('*')
    .eq('user_id', memberId);

  if (funds) {
    for (const fund of funds) {
      history.push({
        id: fund.id,
        type: fund.type as 'NAP_QUY' | 'RUT_QUY',
        amount: fund.amount,
        description: fund.type === 'NAP_QUY' ? 'Nạp tiền vào quỹ' : 'Rút tiền khỏi quỹ',
        date: fund.created_at,
        balance_change: fund.type === 'NAP_QUY' ? fund.amount : -fund.amount
      });
    }
  }

  // Sắp xếp giảm dần theo thời gian
  history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return history;
}

export async function checkNeedsPin(memberId: string): Promise<boolean> {
  const isAdmin = await checkIsAdmin();
  if (isAdmin) return false;

  const config = await getSystemConfig();
  if (!config?.require_pin_for_history) return false;

  // Lấy xem user có đặt mã PIN không
  const { data } = await supabase.from('members').select('pin_code').eq('id', memberId).single();
  if (data?.pin_code) return true; // Có mã PIN và yêu cầu nhập
  
  return false; // Không thiết lập mã PIN thì cho phép xem (hoặc có thể chặn luôn, nhưng thường là cho phép)
}
