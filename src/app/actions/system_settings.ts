'use server';

import { supabase } from '@/lib/supabase';
import { checkIsAdmin } from './auth';

export type SystemConfig = {
  require_pin_for_history: boolean;
};

export async function getSystemConfig(): Promise<SystemConfig | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', 'system_config')
    .maybeSingle();

  if (error || !data || !data.setting_value) return { require_pin_for_history: false };

  return data.setting_value as SystemConfig;
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
