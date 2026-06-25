'use server';

import { supabase } from '@/lib/supabase';
import { checkIsAdmin } from './auth';
import nodemailer from 'nodemailer';

export type EmailTemplate = {
  subject: string;
  html: string;
};

export type EmailConfig = {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  templates?: {
    equal?: EmailTemplate;
    portions?: EmailTemplate;
    exact_amount?: EmailTemplate;
    pay_for_others?: EmailTemplate;
  }
};

const DEFAULT_EQUAL_TEMPLATE: EmailTemplate = {
  subject: '[Quỹ Ăn Trưa] Báo cơm chia đều từ {{payer_name}}',
  html: `<h3>Chào bạn,</h3>
<p>{{payer_name}} vừa báo ăn trưa với tổng tiền <b>{{total_amount}}</b> cho <b>{{participant_count}}</b> người.</p>
<p>Chi tiết: {{description}}</p>
<p>Danh sách chi tiết bị trừ:</p>
{{participants_table}}
<p>Vui lòng kiểm tra lại số dư tài khoản của bạn trên hệ thống.</p>`
};

const DEFAULT_PORTIONS_TEMPLATE: EmailTemplate = {
  subject: '[Quỹ Ăn Trưa] Báo cơm theo số lượng từ {{payer_name}}',
  html: `<h3>Chào bạn,</h3>
<p>{{payer_name}} vừa báo ăn trưa với tổng tiền <b>{{total_amount}}</b>.</p>
<p>Chi tiết: {{description}}</p>
<p>Danh sách chi tiết bị trừ theo suất/số lượng:</p>
{{participants_table}}
<p>Vui lòng kiểm tra lại số dư tài khoản của bạn trên hệ thống.</p>`
};

const DEFAULT_CUSTOM_TEMPLATE: EmailTemplate = {
  subject: '[Quỹ Ăn Trưa] Báo cơm giá trị riêng từ {{payer_name}}',
  html: `<h3>Chào bạn,</h3>
<p>{{payer_name}} vừa báo ăn trưa với tổng tiền <b>{{total_amount}}</b>.</p>
<p>Chi tiết: {{description}}</p>
<p>Danh sách chi tiết bị trừ theo số tiền cụ thể:</p>
{{participants_table}}
<p>Vui lòng kiểm tra lại số dư tài khoản của bạn trên hệ thống.</p>`
};

const DEFAULT_PAY_FOR_OTHERS_TEMPLATE: EmailTemplate = {
  subject: '[Quỹ Ăn Trưa] Báo hộ cơm từ {{payer_name}}',
  html: `<h3>Chào bạn,</h3>
<p>{{payer_name}} vừa báo hộ ăn trưa cho người khác với tổng tiền <b>{{total_amount}}</b>.</p>
<p>Chi tiết: {{description}}</p>
<p>Danh sách người được báo hộ và số tiền tương ứng:</p>
{{participants_table}}
<p>Vui lòng kiểm tra lại số dư tài khoản của bạn trên hệ thống.</p>`
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

  const config = data.setting_value as EmailConfig;
  
  if (!config.templates) {
    config.templates = {};
  }
  if (!config.templates.equal) config.templates.equal = DEFAULT_EQUAL_TEMPLATE;
  if (!config.templates.portions) config.templates.portions = DEFAULT_PORTIONS_TEMPLATE;
  if (!config.templates.exact_amount) config.templates.exact_amount = DEFAULT_CUSTOM_TEMPLATE;
  if (!config.templates.pay_for_others) config.templates.pay_for_others = DEFAULT_PAY_FOR_OTHERS_TEMPLATE;

  return config;
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
