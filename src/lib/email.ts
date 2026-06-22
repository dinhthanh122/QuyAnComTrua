import nodemailer from 'nodemailer';
import { supabase } from '@/lib/supabase';

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  try {
    // Fetch config from database
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'email_config')
      .maybeSingle();

    const config = data?.setting_value;

    if (error || !config || !config.smtp_user || !config.smtp_pass || config.is_enabled === false) {
      console.log("Email chưa được cấu hình hoặc đang tắt, bỏ qua việc gửi.");
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_port === 465, // true for 465, false for other ports
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass,
      },
    });

    const info = await transporter.sendMail({
      from: `"Quỹ Ăn Trưa" <${config.smtp_user}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    });
    console.log("Message sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Lỗi khi gửi email:", error);
    return false;
  }
}
