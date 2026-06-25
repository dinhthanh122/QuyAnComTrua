'use server';

import { supabase } from '@/lib/supabase';
import { checkIsAdmin } from './auth';

export type SystemConfig = {
  require_pin_for_history: boolean;
  expense_warning_threshold?: number;
};

export async function getSystemConfig(): Promise<SystemConfig | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', 'system_config')
    .maybeSingle();

  const defaultConfig: SystemConfig = { 
    require_pin_for_history: false,
    expense_warning_threshold: 100000 
  };

  if (error || !data || !data.setting_value) return defaultConfig;

  const value = data.setting_value as SystemConfig;
  if (value.expense_warning_threshold === undefined) {
    value.expense_warning_threshold = 100000;
  }
  return value;
}

export async function saveSystemConfig(config: SystemConfig) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('app_settings')
    .upsert({
      setting_key: 'system_config',
      setting_value: config
    });

  if (error) {
    throw new Error('Không thể lưu cấu hình: ' + error.message);
  }
}

import { revalidatePath } from 'next/cache';

export async function resetDatabaseAction() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error('Unauthorized');

  await supabase.from('fund_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('expense_splits').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('members').update({ balance: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');

  revalidatePath('/');
  return { success: true };
}
