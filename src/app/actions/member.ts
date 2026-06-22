'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { checkIsAdmin } from './auth';

export async function addMember(name: string, email?: string, receive_notifications: boolean = true, pin_code?: string, gender: string = 'MALE') {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('members')
    .insert([{ name, email: email || null, balance: 0, receive_notifications, pin_code: pin_code || null, gender }]);

  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function updateMember(id: string, name: string, email?: string, receive_notifications: boolean = true, pin_code?: string, gender: string = 'MALE') {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('members')
    .update({ name, email: email || null, receive_notifications, pin_code: pin_code || null, gender })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function deleteMember(id: string) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error('Unauthorized');

  // Supabase will throw a foreign key error if the user is referenced in expenses or expense_splits
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id);

  if (error) {
    if (error.code === '23503') { // Foreign key violation
      throw new Error('Không thể xóa vì người này đã có lịch sử tham gia ăn hoặc trả tiền.');
    }
    throw new Error(error.message);
  }
  revalidatePath('/');
}
