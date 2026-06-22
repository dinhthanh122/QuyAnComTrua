'use server';

import { supabase } from '@/lib/supabase';

export type NotificationType = {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
};

export async function getRecentNotifications(): Promise<NotificationType[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error("Lỗi lấy thông báo:", error);
    return [];
  }

  return data as NotificationType[];
}
