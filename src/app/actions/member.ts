'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { checkIsAdmin } from './auth';

export async function addMember(name: string, email?: string, phone?: string, receive_notifications: boolean = true, pin_code?: string, gender: string = 'MALE') {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('members')
    .insert([{ name, email: email || null, phone: phone || null, balance: 0, receive_notifications, pin_code: pin_code || null, gender }]);

  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function updateMember(id: string, name: string, email?: string, phone?: string, receive_notifications: boolean = true, pin_code?: string, gender: string = 'MALE') {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('members')
    .update({ name, email: email || null, phone: phone || null, receive_notifications, pin_code: pin_code || null, gender })
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

export async function saveMemberGroup(memberId: string, name: string, memberIds: string[]) {
  const { data: member, error: fetchErr } = await supabase
    .from('members')
    .select('saved_groups')
    .eq('id', memberId)
    .single();
    
  if (fetchErr) throw new Error(fetchErr.message);
  
  const currentGroups = member?.saved_groups || [];
  const newGroup = {
    id: crypto.randomUUID(),
    name,
    member_ids: memberIds
  };
  
  const { error: updateErr } = await supabase
    .from('members')
    .update({ saved_groups: [...currentGroups, newGroup] })
    .eq('id', memberId);
    
  if (updateErr) throw new Error(updateErr.message);
  revalidatePath('/');
}

export async function deleteMemberGroup(memberId: string, groupId: string) {
  const { data: member, error: fetchErr } = await supabase
    .from('members')
    .select('saved_groups')
    .eq('id', memberId)
    .single();
    
  if (fetchErr) throw new Error(fetchErr.message);
  
  const currentGroups = member?.saved_groups || [];
  const newGroups = currentGroups.filter((g: any) => g.id !== groupId);
  
  const { error: updateErr } = await supabase
    .from('members')
    .update({ saved_groups: newGroups })
    .eq('id', memberId);
    
  if (updateErr) throw new Error(updateErr.message);
  revalidatePath('/');
}
