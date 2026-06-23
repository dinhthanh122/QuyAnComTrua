'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { checkIsAdmin } from './auth';
import { sendEmail } from '@/lib/email';

export type Member = {
  id: string;
  name: string;
  balance: number;
  email?: string;
  receive_notifications?: boolean;
  pin_code?: string;
  meal_count?: number;
  gender?: 'MALE' | 'FEMALE' | 'UNKNOWN';
};

export async function getMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select('*');

  let membersList: Member[] = [];

  if (error || !data || data.length === 0) {
    console.log('Sử dụng dữ liệu giả lập (do DB trống hoặc lỗi kết nối):', error?.message);
    membersList = [
      { id: 'uuid-1', name: 'Nguyễn Văn A', balance: 150000 },
      { id: 'uuid-2', name: 'Trần Thị B', balance: 50000 },
      { id: 'uuid-3', name: 'Lê Văn C', balance: 0 },
      { id: 'uuid-4', name: 'Phạm Văn D', balance: -80000 },
      { id: 'uuid-5', name: 'Hoàng Thị E', balance: -120000 }
    ];
  } else {
    membersList = data as Member[];
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: splitsData, error: splitsError } = await supabase
    .from('expense_splits')
    .select('user_id, expenses!inner(date)')
    .gte('expenses.date', startOfMonth.toISOString());

  if (splitsError) {
    console.error('Error fetching splits for meal counts:', splitsError);
  }

  const mealCounts: Record<string, number> = {};
  if (splitsData) {
    splitsData.forEach(s => {
      mealCounts[s.user_id] = (mealCounts[s.user_id] || 0) + 1;
    });
  }

  membersList = membersList.map(m => ({
    ...m,
    meal_count: mealCounts[m.id] || 0
  }));

  // Sắp xếp theo Tên (từ cuối cùng), sau đó theo Họ đệm
  return membersList.sort((a, b) => {
    const nameA = a.name.trim();
    const nameB = b.name.trim();
    const firstA = nameA.split(' ').pop() || '';
    const firstB = nameB.split(' ').pop() || '';
    
    const cmp = firstA.localeCompare(firstB, 'vi-VN');
    if (cmp !== 0) return cmp;
    return nameA.localeCompare(nameB, 'vi-VN');
  });
}

export async function addExpense(data: {
  payer_id: string;
  total_amount: number;
  description: string;
  participants: string[];
  date?: string;
}) {
  const amount_per_person = data.total_amount / data.participants.length;

  const { error } = await supabase.rpc('add_expense_transaction', {
    p_payer_id: data.payer_id,
    p_total_amount: data.total_amount,
    p_description: data.description,
    p_participants: data.participants,
    p_amount_per_person: amount_per_person
  });

  if (error) {
    console.error('Error adding expense:', error);
    throw new Error('Failed to add expense: ' + error.message);
  }

  // Update date if provided
  if (data.date) {
    const { data: newExpense } = await supabase
      .from('expenses')
      .select('id')
      .eq('payer_id', data.payer_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (newExpense) {
      await supabase.from('expenses').update({ date: data.date }).eq('id', newExpense.id);
    }
  }

  // Lấy tên người báo
  const { data: payerData } = await supabase.from('members').select('name').eq('id', data.payer_id).single();
  const payerName = payerData?.name || 'Ai đó';

  // Chèn thông báo chung
  const content = `${payerName} vừa báo ăn trưa với tổng tiền ${data.total_amount.toLocaleString()}đ cho ${data.participants.length} người.`;
  await supabase.from('notifications').insert([{
    title: 'Báo cơm mới',
    content,
    type: 'EXPENSE'
  }]);

  // Lấy email những người nhận thông báo
  const { data: membersToNotify } = await supabase
    .from('members')
    .select('email, name')
    .eq('receive_notifications', true)
    .not('email', 'is', null)
    .not('email', 'eq', '');

  if (membersToNotify && membersToNotify.length > 0) {
    const emails = membersToNotify.map(m => m.email as string);
    await sendEmail({
      to: emails,
      subject: `[Quỹ Ăn Trưa] Báo cơm mới từ ${payerName}`,
      html: `
        <h3>Chào bạn,</h3>
        <p>${content}</p>
        <p>Chi tiết: ${data.description}</p>
        <p>Vui lòng kiểm tra lại số dư tài khoản của bạn trên hệ thống.</p>
      `
    });
  }

  revalidatePath('/', 'layout');
}

export async function settleDebt(data: {
  sender_id: string;
  receiver_id: string;
  amount: number;
}) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    throw new Error('Chỉ quản lý mới có quyền thực hiện chức năng này.');
  }

  const { error } = await supabase.rpc('settle_debt_transaction', {
    p_sender_id: data.sender_id,
    p_receiver_id: data.receiver_id,
    p_amount: data.amount
  });

  if (error) {
    console.error('Error settling debt:', error);
    throw new Error('Failed to settle debt: ' + error.message);
  }

  // Thông báo thanh toán nợ
  const { data: senderData } = await supabase.from('members').select('name').eq('id', data.sender_id).single();
  const { data: receiverData } = await supabase.from('members').select('name').eq('id', data.receiver_id).single();
  
  const content = `${senderData?.name} đã trả ${data.amount.toLocaleString()}đ cho ${receiverData?.name}.`;
  await supabase.from('notifications').insert([{
    title: 'Thanh toán nợ',
    content,
    type: 'SETTLE'
  }]);

  revalidatePath('/', 'layout');
}

export async function checkDuplicateExpense(data: {
  total_amount: number;
  participants: string[];
  date?: string;
}): Promise<boolean> {
  const startOfDay = data.date ? new Date(data.date) : new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const { data: expenses } = await supabase
    .from('expenses')
    .select('id')
    .gte('date', startOfDay.toISOString())
    .lt('date', endOfDay.toISOString())
    .eq('total_amount', data.total_amount);

  if (!expenses || expenses.length === 0) return false;

  for (const exp of expenses) {
    const { data: splits } = await supabase.from('expense_splits').select('user_id').eq('expense_id', exp.id);
    if (splits) {
      const splitUserIds = splits.map(s => s.user_id).sort();
      const newParticipantIds = [...data.participants].sort();
      if (JSON.stringify(splitUserIds) === JSON.stringify(newParticipantIds)) {
        return true;
      }
    }
  }

  return false;
}

export async function updateExpense(data: {
  expense_id: string;
  payer_id: string;
  total_amount: number;
  description: string;
  participants: string[];
  updater_id?: string;
  pin_code?: string;
}) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    if (!data.updater_id || !data.pin_code) {
      throw new Error('Chỉ quản lý hoặc thành viên có mã PIN mới có quyền sửa.');
    }
    const { data: memberData } = await supabase.from('members').select('pin_code').eq('id', data.updater_id).single();
    if (!memberData || memberData.pin_code !== data.pin_code) {
      throw new Error('Mã PIN xác thực không chính xác.');
    }
  }

  const amount_per_person = data.total_amount / data.participants.length;

  const { error } = await supabase.rpc('update_expense_transaction', {
    p_expense_id: data.expense_id,
    p_new_payer_id: data.payer_id,
    p_new_total_amount: data.total_amount,
    p_new_description: data.description,
    p_new_participants: data.participants,
    p_new_amount_per_person: amount_per_person
  });

  if (error) {
    console.error('Error updating expense:', error);
    throw new Error('Failed to update expense: ' + error.message);
  }

  // Lấy tên người báo
  const { data: payerData } = await supabase.from('members').select('name').eq('id', data.payer_id).single();
  const payerName = payerData?.name || 'Ai đó';

  // Chèn thông báo chung
  const content = `${isAdmin ? 'Admin' : payerName} vừa cập nhật lại thông tin hóa đơn ${data.total_amount.toLocaleString()}đ của ${payerName}.`;
  await supabase.from('notifications').insert([{
    title: 'Cập nhật hóa đơn',
    content,
    type: 'EXPENSE'
  }]);

  // Gửi email thông báo
  const { data: membersToNotify } = await supabase
    .from('members')
    .select('email, name')
    .eq('receive_notifications', true)
    .not('email', 'is', null)
    .not('email', 'eq', '');

  if (membersToNotify && membersToNotify.length > 0) {
    const emails = membersToNotify.map(m => m.email as string);
    await sendEmail({
      to: emails,
      subject: `[Quỹ Ăn Trưa] Cập nhật hóa đơn: ${data.total_amount.toLocaleString()}đ`,
      html: `
        <h3>Chào bạn,</h3>
        <p>${content}</p>
        <p>Chi tiết ghi chú: ${data.description}</p>
        <p>Hệ thống đã tự động tính toán lại và hoàn trả/trừ số dư tương ứng với sự thay đổi mới. Vui lòng kiểm tra lại số dư tài khoản của bạn trên hệ thống.</p>
      `
    });
  }

  revalidatePath('/');
}

export async function getExpenseDetails(expense_id: string): Promise<any> {
  const { data: exp } = await supabase.from('expenses').select('*').eq('id', expense_id).single();
  if (!exp) return null;

  const { data: splits } = await supabase.from('expense_splits').select('user_id').eq('expense_id', expense_id);
  const participant_ids = splits ? splits.map(s => s.user_id) : [];

  return {
    id: exp.id,
    type: 'EXPENSE',
    payer_id: exp.payer_id,
    amount: exp.total_amount,
    description: exp.description || 'Báo cơm',
    participant_ids: participant_ids,
  };
}
