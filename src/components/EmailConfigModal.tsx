'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Mail, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { getEmailConfig, saveEmailConfig, testEmailConnection, EmailConfig } from '@/app/actions/email_settings';

export function EmailConfigModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null);

  const [config, setConfig] = useState<EmailConfig>({
    smtp_host: 'smtp.gmail.com',
    smtp_port: 465,
    smtp_user: '',
    smtp_pass: '',
  });

  useEffect(() => {
    if (open) {
      // Load config when opened
      getEmailConfig().then(data => {
        if (data) {
          setConfig(data);
        }
      });
      setTestResult(null);
    }
  }, [open]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveEmailConfig(config);
      setTestResult({ success: true, message: 'Đã lưu cấu hình!' });
    } catch (e: any) {
      setTestResult({ success: false, message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Auto save before testing
      await saveEmailConfig(config);
      
      const result = await testEmailConnection(config);
      setTestResult(result);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="w-full outline-none">
        <div className="w-full h-14 rounded-xl text-base border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center font-semibold transition-colors cursor-pointer">
          <Mail className="w-5 h-5 mr-2" />
          Cấu hình Email
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl">Cấu hình Hệ thống Gửi Mail</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">SMTP Host</label>
            <Input 
              value={config.smtp_host}
              onChange={e => setConfig({...config, smtp_host: e.target.value})}
              className="mt-1 rounded-xl"
            />
          </div>
          
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">SMTP Port</label>
            <Input 
              type="number"
              value={config.smtp_port}
              onChange={e => setConfig({...config, smtp_port: parseInt(e.target.value)})}
              className="mt-1 rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Tài khoản Email gửi đi (VD: Gmail)</label>
            <Input 
              type="email"
              value={config.smtp_user}
              onChange={e => setConfig({...config, smtp_user: e.target.value})}
              className="mt-1 rounded-xl"
              placeholder="email@gmail.com"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Mật khẩu ứng dụng (App Password)</label>
            <Input 
              type="password"
              value={config.smtp_pass}
              onChange={e => setConfig({...config, smtp_pass: e.target.value})}
              className="mt-1 rounded-xl"
              placeholder="••••••••••••"
            />
          </div>

          {testResult && (
            <div className={`p-3 rounded-xl flex items-start gap-2 text-sm font-medium ${testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {testResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <Button 
              variant="outline"
              className="flex-1 rounded-xl" 
              onClick={handleTest}
              disabled={loading || testing || !config.smtp_user || !config.smtp_pass}
            >
              {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Test Kết Nối
            </Button>
            <Button 
              className="flex-1 rounded-xl bg-slate-900" 
              onClick={handleSave}
              disabled={loading || testing}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Lưu Cấu Hình
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
