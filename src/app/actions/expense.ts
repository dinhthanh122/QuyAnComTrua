'use server'

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { checkIsAdmin, getAuthenticatedMemberId } from './auth';
import { sendEmail } from '@/lib/email';

export type Member = {
  id: string;
  name: string;
  balance: number;
  email?: string;
  phone?: string;
  receive_notifications?: boolean;
  pin_code?: string;
  meal_count?: number;
  gender?: 'MALE' | 'FEMALE' | 'UNKNOWN';
  isMasked?: boolean;
  saved_groups?: { id: string, name: string, member_ids: string[] }[];
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

  const isAdmin = await checkIsAdmin();
  const memberId = await getAuthenticatedMemberId();

  if (!isAdmin && memberId) {
    membersList = membersList.map(m => {
      if (m.id !== memberId) {
        let maskedEmail = '***';
        if (m.email) {
          const parts = m.email.split('@');
          if (parts.length === 2) {
            maskedEmail = parts[0].substring(0, 3) + '***@' + parts[1];
          } else {
            maskedEmail = m.email.substring(0, 3) + '***';
          }
        }
        
        return {
          ...m,
          email: maskedEmail,
          phone: '***',
          pin_code: undefined,
          isMasked: true,
        };
      }
      return m;
    });
  }

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

export type ParticipantSplit = {
  user_id: string;
  portions: number;
  sponsor_id?: string | null;
};

export async function addExpense(data: {
  payer_id: string;
  total_amount: number;
  description: string;
  splits: ParticipantSplit[];
  date?: string;
  split_mode?: 'equal' | 'portions' | 'exact_amount' | 'pay_for_others';
}) {
  const total_portions = data.splits.reduce((acc, curr) => acc + curr.portions, 0);
  if (total_portions <= 0) throw new Error('Số suất ăn phải lớn hơn 0.');
  
  const portionPrice = data.total_amount / total_portions;

  // Lấy dữ liệu members hiện tại để cập nhật an toàn
  const { data: membersData } = await supabase.from('members').select('id, balance');
  if (!membersData) throw new Error('Lỗi truy cập dữ liệu thành viên.');
  const balanceMap = new Map(membersData.map(m => [m.id, m.balance]));

  // Tính netChanges
  const netChanges: Record<string, number> = {};
  netChanges[data.payer_id] = (netChanges[data.payer_id] || 0) + data.total_amount;

  for (const split of data.splits) {
    const cost = split.portions * portionPrice;
    const responsible_id = split.sponsor_id || split.user_id;
    netChanges[responsible_id] = (netChanges[responsible_id] || 0) - cost;
  }

  // Cập nhật số dư trong DB
  for (const [userId, change] of Object.entries(netChanges)) {
    if (change === 0) continue;
    const currentBalance = balanceMap.get(userId) || 0;
    const { error: updateError } = await supabase.from('members').update({ balance: currentBalance + change }).eq('id', userId);
    if (updateError) {
      console.error(`Lỗi cập nhật số dư cho user ${userId}`, updateError);
    }
  }

  // Encode META
  const metaObj = { net: netChanges, splits: data.splits };
  const fullDescription = `${data.description} | META: ${JSON.stringify(metaObj)}`;

  // Thêm vào bảng expenses
  const { data: newExpense, error: expError } = await supabase
    .from('expenses')
    .insert([{
      payer_id: data.payer_id,
      total_amount: data.total_amount,
      description: fullDescription,
      date: data.date || new Date().toISOString()
    }])
    .select('id')
    .single();

  if (expError || !newExpense) {
    throw new Error('Failed to create expense: ' + (expError?.message || 'Unknown error'));
  }

  // Thêm vào bảng expense_splits
  const splitRows = [];
  for (const split of data.splits) {
    // Chỉ những suất tự trả mới tính amount_owed vào db (dành cho UI hiển thị cũ)
    // Nếu được bao thì amount_owed = 0
    const cost = split.portions * portionPrice;
    const isSponsored = split.sponsor_id && split.sponsor_id !== split.user_id;
    const total_owed = isSponsored ? 0 : cost;

    splitRows.push({
      expense_id: newExpense.id,
      user_id: split.user_id,
      amount_owed: total_owed
    });
  }

  if (splitRows.length > 0) {
    const { error: splitError } = await supabase.from('expense_splits').insert(splitRows);
    if (splitError) {
      console.error('Lỗi khi chèn expense_splits', splitError);
    }
  }

  // Lấy tên người báo
  const { data: payerData } = await supabase.from('members').select('name').eq('id', data.payer_id).single();
  const payerName = payerData?.name || 'Ai đó';

  // Chèn thông báo chung
  const content = `${payerName} vừa báo ăn trưa với tổng tiền ${data.total_amount.toLocaleString()}đ cho ${data.splits.length} người.`;
  await supabase.from('notifications').insert([{
    title: 'Báo cơm mới',
    content,
    type: 'EXPENSE'
  }]);

  // Lấy email những người nhận thông báo
  await sendExpenseEmail(
    payerName, 
    data.total_amount, 
    data.description || 'Ăn trưa', 
    data.splits, 
    portionPrice, 
    data.split_mode || 'equal', 
    false
  );

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
  splits: ParticipantSplit[];
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
      const dbSplitCounts = splits.reduce((acc: any, s: any) => {
        acc[s.user_id] = (acc[s.user_id] || 0) + 1;
        return acc;
      }, {});
      const newSplitCounts = data.splits.reduce((acc: any, s: any) => {
        acc[s.user_id] = (acc[s.user_id] || 0) + s.portions;
        return acc;
      }, {});
      
      if (JSON.stringify(dbSplitCounts) === JSON.stringify(newSplitCounts)) {
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
  splits: ParticipantSplit[];
  updater_id?: string;
  pin_code?: string;
  split_mode?: 'equal' | 'portions' | 'exact_amount' | 'pay_for_others';
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

  // 1. Fetch old expense
  const { data: oldExp } = await supabase.from('expenses').select('*').eq('id', data.expense_id).single();
  const { data: oldSplits } = await supabase.from('expense_splits').select('*').eq('expense_id', data.expense_id);
  
  // Calculate old net changes to reverse
  const oldNetChanges: Record<string, number> = {};
  if (oldExp.description && oldExp.description.includes('META: ')) {
    try {
      const metaStr = oldExp.description.split('META: ')[1];
      const meta = JSON.parse(metaStr);
      if (meta.net) {
        for (const [userId, val] of Object.entries(meta.net)) {
          oldNetChanges[userId] = val as number;
        }
      }
    } catch(e) {}
  }
  
  if (Object.keys(oldNetChanges).length === 0) {
    // Fallback for old records without META
    oldNetChanges[oldExp.payer_id] = oldExp.total_amount;
    if (oldSplits) {
      for (const s of oldSplits) {
        oldNetChanges[s.user_id] = (oldNetChanges[s.user_id] || 0) - s.amount_owed;
      }
    }
  }

  // Calculate new net changes
  const total_portions = data.splits.reduce((acc, curr) => acc + curr.portions, 0);
  if (total_portions <= 0) throw new Error('Số suất ăn phải lớn hơn 0.');
  const portionPrice = data.total_amount / total_portions;

  const newNetChanges: Record<string, number> = {};
  newNetChanges[data.payer_id] = (newNetChanges[data.payer_id] || 0) + data.total_amount;
  for (const split of data.splits) {
    const cost = split.portions * portionPrice;
    const responsible_id = split.sponsor_id || split.user_id;
    newNetChanges[responsible_id] = (newNetChanges[responsible_id] || 0) - cost;
  }

  // Calculate diff to apply to balances
  const diffChanges: Record<string, number> = {};
  const allUsers = Array.from(new Set([...Object.keys(oldNetChanges), ...Object.keys(newNetChanges)]));
  for (const u of allUsers) {
    diffChanges[u] = (newNetChanges[u] || 0) - (oldNetChanges[u] || 0);
  }

  // Lấy dữ liệu members hiện tại để cập nhật an toàn
  const { data: membersData } = await supabase.from('members').select('id, balance');
  const balanceMap = new Map(membersData?.map(m => [m.id, m.balance]) || []);

  for (const [userId, change] of Object.entries(diffChanges)) {
    if (change === 0) continue;
    const currentBalance = balanceMap.get(userId) || 0;
    await supabase.from('members').update({ balance: currentBalance + change }).eq('id', userId);
  }

  // Update expenses
  const metaObj = { net: newNetChanges, splits: data.splits };
  const baseDescription = data.description.split(' | META:')[0];
  const fullDescription = `${baseDescription} | META: ${JSON.stringify(metaObj)}`;

  await supabase.from('expenses').update({
    payer_id: data.payer_id,
    total_amount: data.total_amount,
    description: fullDescription
  }).eq('id', data.expense_id);

  // Delete old splits
  await supabase.from('expense_splits').delete().eq('expense_id', data.expense_id);

  // Insert new splits
  const splitRows = [];
  for (const split of data.splits) {
    const cost = split.portions * portionPrice;
    const isSponsored = split.sponsor_id && split.sponsor_id !== split.user_id;
    const total_owed = isSponsored ? 0 : cost;

    splitRows.push({
      expense_id: data.expense_id,
      user_id: split.user_id,
      amount_owed: total_owed
    });
  }
  if (splitRows.length > 0) {
    await supabase.from('expense_splits').insert(splitRows);
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
  await sendExpenseEmail(
    payerName, 
    data.total_amount, 
    data.description || 'Ăn trưa', 
    data.splits, 
    portionPrice, 
    data.split_mode || 'equal', 
    true
  );

  revalidatePath('/');
}

export async function getExpenseDetails(expense_id: string): Promise<any> {
  const { data: exp } = await supabase.from('expenses').select('*').eq('id', expense_id).single();
  if (!exp) return null;

  const { data: splits } = await supabase.from('expense_splits').select('user_id').eq('expense_id', expense_id);
  const splitCounts = splits ? splits.reduce((acc: any, s: any) => {
    acc[s.user_id] = (acc[s.user_id] || 0) + 1;
    return acc;
  }, {}) : {};

  // Parse META to find sponsors
  const metaSplits = [];
  let metaObj: any = null;
  const baseDesc = exp.description || 'Báo cơm';
  const descParts = baseDesc.split(' | META: ');
  const cleanDesc = descParts[0];

  if (descParts.length > 1) {
    try {
      metaObj = JSON.parse(descParts[1]);
      if (metaObj.splits) {
        metaSplits.push(...metaObj.splits);
      }
    } catch (e) {}
  }

  // To reconstruct advanced splits accurately from old database
  if (metaSplits.length === 0) {
    Object.keys(splitCounts).forEach(uid => {
      metaSplits.push({
        user_id: uid,
        portions: splitCounts[uid],
        sponsor_id: null
      });
    });
  }

  return {
    id: exp.id,
    type: 'EXPENSE',
    payer_id: exp.payer_id,
    amount: exp.total_amount,
    description: cleanDesc,
    participant_ids: Object.keys(splitCounts),
    splits: metaSplits
  };
}

export async function deleteExpense(data: {
  expense_id: string;
  updater_id?: string;
  pin_code?: string;
}) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    if (!data.updater_id || !data.pin_code) {
      throw new Error('Chỉ quản lý hoặc thành viên có mã PIN mới có quyền huỷ.');
    }
    const { data: memberData } = await supabase.from('members').select('pin_code').eq('id', data.updater_id).single();
    if (!memberData || memberData.pin_code !== data.pin_code) {
      throw new Error('Mã PIN xác thực không chính xác.');
    }
  }

  // Lấy thông tin hóa đơn
  const { data: exp, error: expError } = await supabase.from('expenses').select('*').eq('id', data.expense_id).single();
  if (expError || !exp) throw new Error('Không tìm thấy hóa đơn.');

  // Lấy danh sách người tham gia
  const { data: splits } = await supabase.from('expense_splits').select('*').eq('expense_id', data.expense_id);
  if (!splits) throw new Error('Lỗi lấy chi tiết hóa đơn.');

  // Lấy danh sách thành viên hiện tại để cập nhật số dư an toàn
  const { data: members } = await supabase.from('members').select('id, balance');
  if (!members) throw new Error('Lỗi truy xuất dữ liệu thành viên.');
  
  const balanceMap = new Map(members.map(m => [m.id, m.balance]));

  // Tính toán số tiền hoàn lại (đảo ngược lại net changes)
  const oldNetChanges: Record<string, number> = {};
  if (exp.description && exp.description.includes('META: ')) {
    try {
      const metaStr = exp.description.split('META: ')[1];
      const meta = JSON.parse(metaStr);
      if (meta.net) {
        for (const [userId, val] of Object.entries(meta.net)) {
          oldNetChanges[userId] = val as number;
        }
      }
    } catch(e) {}
  }
  
  if (Object.keys(oldNetChanges).length === 0) {
    // Fallback cho hóa đơn cũ
    oldNetChanges[exp.payer_id] = exp.total_amount;
    for (const s of splits) {
      oldNetChanges[s.user_id] = (oldNetChanges[s.user_id] || 0) - s.amount_owed;
    }
  }

  // Cập nhật số dư cho các thành viên (Trừ đi phần net_change cũ)
  for (const [userId, change] of Object.entries(oldNetChanges)) {
    if (change === 0) continue;
    const currentBalance = balanceMap.get(userId) || 0;
    const { error: updateError } = await supabase.from('members').update({ balance: currentBalance - change }).eq('id', userId);
    if (updateError) {
       console.error(`Lỗi cập nhật số dư cho user ${userId}`, updateError);
    }
  }

  // Xóa các bản ghi splits và hóa đơn
  await supabase.from('expense_splits').delete().eq('expense_id', data.expense_id);
  await supabase.from('expenses').delete().eq('id', data.expense_id);

  // Tạo thông báo
  const { data: payerData } = await supabase.from('members').select('name').eq('id', exp.payer_id).single();
  const payerName = payerData?.name || 'Ai đó';
  
  const content = `${isAdmin ? 'Admin' : payerName} vừa hủy hóa đơn ${exp.total_amount.toLocaleString()}đ của ${payerName}. Các số dư đã được hoàn lại.`;
  await supabase.from('notifications').insert([{
    title: 'Hủy hóa đơn',
    content,
    type: 'EXPENSE'
  }]);

  // Lấy danh sách email và gửi email thông báo hủy
  const { data: membersToNotify } = await supabase
    .from('members')
    .select('email')
    .eq('receive_notifications', true)
    .not('email', 'is', null)
    .not('email', 'eq', '');

  const emailList = membersToNotify ? membersToNotify.map(m => m.email as string) : [];

  if (emailList.length > 0) {
    try {
      await sendEmail({
        to: emailList,
        subject: `[Quỹ Ăn Trưa] Hủy hóa đơn ${exp.total_amount.toLocaleString()}đ`,
        html: `
          <h3>Xin chào,</h3>
          <p>${content}</p>
          <p>Mọi người vui lòng kiểm tra lại số dư tài khoản trên hệ thống nhé!</p>
          <p>Trân trọng,<br/>Hệ thống Quỹ Ăn Trưa</p>
        `
      });
    } catch (err) {
      console.error('Lỗi gửi email hủy hóa đơn:', err);
    }
  }

  revalidatePath('/', 'layout');
}

import { getEmailConfig } from './email_settings';

async function sendExpenseEmail(
  payerName: string,
  totalAmount: number,
  description: string,
  splits: ParticipantSplit[],
  portionPrice: number,
  splitMode: 'equal' | 'portions' | 'exact_amount' | 'pay_for_others',
  isUpdate: boolean
) {
  const config = await getEmailConfig();
  if (!config) return;

  const { data: membersToNotify } = await supabase
    .from('members')
    .select('id, email, name')
    .eq('receive_notifications', true)
    .not('email', 'is', null)
    .not('email', 'eq', '');

  if (!membersToNotify || membersToNotify.length === 0) return;

  const emails = membersToNotify.map(m => m.email as string);

  const template = config.templates?.[splitMode];
  if (!template || !template.subject || !template.html) return;

  // Create participants_table HTML
  const { data: allMembers } = await supabase.from('members').select('id, name');
  const nameMap = new Map((allMembers || []).map(m => [m.id, m.name]));

  let tableHtml = `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 600px; margin-top: 15px; border-color: #e5e7eb;">
    <thead>
      <tr style="background-color: #f3f4f6;">
        <th style="text-align: left;">Thành viên</th>
        <th style="text-align: right;">Số tiền trừ</th>
      </tr>
    </thead>
    <tbody>`;

  for (const split of splits) {
    const cost = split.portions * portionPrice;
    const name = nameMap.get(split.user_id) || 'Unknown';
    const sponsorName = split.sponsor_id ? (nameMap.get(split.sponsor_id) || 'Unknown') : null;
    
    let displayCost = cost;
    let label = name;
    if (sponsorName && sponsorName !== name) {
        label = `${name} (Được báo hộ bởi ${sponsorName})`;
    }
    
    tableHtml += `
      <tr>
        <td>${label}</td>
        <td style="text-align: right; font-weight: bold; color: #dc2626;">-${displayCost.toLocaleString('vi-VN')}đ</td>
      </tr>
    `;
  }
  tableHtml += `</tbody></table>`;

  const totalStr = `${totalAmount.toLocaleString('vi-VN')}đ`;

  const subject = (isUpdate ? '[Cập nhật] ' : '') + template.subject
    .replace(/\{\{payer_name\}\}/g, payerName)
    .replace(/\{\{total_amount\}\}/g, totalStr)
    .replace(/\{\{description\}\}/g, description)
    .replace(/\{\{participant_count\}\}/g, splits.length.toString());

  const html = (isUpdate ? '<p style="color:red; font-weight:bold; font-size:16px;">⚠️ ĐÂY LÀ THÔNG BÁO CẬP NHẬT HÓA ĐƠN CŨ. SỐ DƯ ĐÃ ĐƯỢC HỆ THỐNG TÍNH TOÁN LẠI.</p>' : '') + template.html
    .replace(/\{\{payer_name\}\}/g, payerName)
    .replace(/\{\{total_amount\}\}/g, totalStr)
    .replace(/\{\{description\}\}/g, description)
    .replace(/\{\{participant_count\}\}/g, splits.length.toString())
    .replace(/\{\{participants_table\}\}/g, tableHtml);

  await sendEmail({
    to: emails,
    subject,
    html,
  });
}
