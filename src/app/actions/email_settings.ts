'use server';

import { supabase } from '@/lib/supabase';
import { checkIsAdmin } from './auth';
import nodemailer from 'nodemailer';

export type EmailConfig = {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
};

export async function getEmailConfig(): Promise<EmailConfig | null> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return null;

  const { data, error } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', 'email_config')
    .single();

  if (error || !data || !data.setting_value) return null;

  return data.setting_value as EmailConfig;
}

export async function saveEmailConfig(config: EmailConfig) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('app_settings')
    .upsert({
      setting_key: 'email_config',
      setting_value: config
    });

  if (error) {
    throw new Error('Không thể lưu cấu hình: ' + error.message);
  }
}

export async function testEmailConnection(config: EmailConfig) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) throw new Error('Unauthorized');

  try {
    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_port === 465, // true for 465, false for other ports
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass,
      },
    });

    // Verify connection configuration
    await transporter.verify();

    // Send a test email to the configured user themselves
    const info = await transporter.sendMail({
      from: `"Quỹ Ăn Trưa Test" <${config.smtp_user}>`,
      to: config.smtp_user,
      subject: "Test kết nối Gửi Email",
      html: `
        <h3>Chào bạn,</h3>
        <p>Nếu bạn nhận được email này, có nghĩa là cấu hình SMTP của bạn trên hệ thống Quỹ Ăn Trưa đã hoạt động thành công!</p>
      `,
    });

    return { success: true, message: 'Kết nối và gửi thư thử nghiệm thành công!' };
  } catch (error: any) {
    console.error("Test email failed:", error);
    return { success: false, message: error.message || 'Lỗi kết nối SMTP' };
  }
}
