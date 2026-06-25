'use server';

import { supabase } from '@/lib/supabase';
import { checkIsAdmin } from './auth';

export type WarningThreshold = {
  id: string;
  amount: number;
  message: string;
};

export type SystemConfig = {
  require_pin_for_history: boolean;
  expense_warning_threshold?: number; // legacy
  expense_warning_thresholds?: WarningThreshold[];
};

const DEFAULT_THRESHOLDS: WarningThreshold[] = [
  {
    id: 'default-1',
    amount: 100000,
    message: 'Đơn giá mỗi suất hiện tại quá cao. Vui lòng kiểm tra lại xem có nhập dư số 0 không nhé!'
  },
  {
    id: 'default-2',
    amount: 1000000,
    message: 'Đội bạn ăn khỏe thật đấy!'
  }
];

export async function getSystemConfig(): Promise<SystemConfig | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', 'system_config')
    .maybeSingle();

  const defaultConfig: SystemConfig = { 
    require_pin_for_history: false,
    expense_warning_thresholds: DEFAULT_THRESHOLDS
  };

  if (error || !data || !data.setting_value) return defaultConfig;

  let rawValue: SystemConfig;
  if (typeof data.setting_value === 'string') {
    try {
      rawValue = JSON.parse(data.setting_value);
    } catch {
      rawValue = {} as SystemConfig;
    }
  } else {
    rawValue = data.setting_value as SystemConfig;
  }
  const value = { ...rawValue };
  
  // Migration from old schema
  if (!value.expense_warning_thresholds) {
    if (value.expense_warning_threshold !== undefined) {
      value.expense_warning_thresholds = [
        {
          id: 'legacy-1',
          amount: value.expense_warning_threshold,
          message: 'Đơn giá mỗi suất hiện tại quá cao. Vui lòng kiểm tra lại xem có nhập dư số 0 không nhé!'
        }
      ];
    } else {
      value.expense_warning_thresholds = DEFAULT_THRESHOLDS;
    }
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
