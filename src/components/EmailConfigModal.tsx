'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Mail, Loader2, CheckCircle2, XCircle, Code2, Server } from 'lucide-react';
import { getEmailConfig, saveEmailConfig, testEmailConnection, EmailConfig } from '@/app/actions/email_settings';

export function EmailConfigModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null);

  const [activeTab, setActiveTab] = useState<'smtp' | 'equal' | 'portions' | 'exact_amount' | 'pay_for_others'>('smtp');

  const [config, setConfig] = useState<EmailConfig>({
    smtp_host: 'smtp.gmail.com',
    smtp_port: 465,
    smtp_user: '',
    smtp_pass: '',
    templates: {
      equal: { subject: '', html: '' },
      portions: { subject: '', html: '' },
      exact_amount: { subject: '', html: '' },
      pay_for_others: { subject: '', html: '' },
    }
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
      <DialogContent className="sm:max-w-4xl w-[95vw] rounded-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl">Cấu hình Gửi Mail & Mẫu Email</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-56 bg-slate-50 border-r border-slate-200 flex flex-col overflow-y-auto shrink-0">
            <button 
              onClick={() => setActiveTab('smtp')}
              className={`text-left px-4 py-3 text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'smtp' ? 'bg-white text-blue-600 border-l-4 border-l-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 border-l-4 border-l-transparent'}`}
            >
              <Server className="w-4 h-4" />
              Máy chủ SMTP
            </button>
            <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">
              Mẫu Email
            </div>
            <button 
              onClick={() => setActiveTab('equal')}
              className={`text-left px-4 py-3 text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'equal' ? 'bg-white text-blue-600 border-l-4 border-l-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 border-l-4 border-l-transparent'}`}
            >
              <Code2 className="w-4 h-4" />
              Chia đều
            </button>
            <button 
              onClick={() => setActiveTab('portions')}
              className={`text-left px-4 py-3 text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'portions' ? 'bg-white text-blue-600 border-l-4 border-l-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 border-l-4 border-l-transparent'}`}
            >
              <Code2 className="w-4 h-4" />
              Theo số lượng
            </button>
            <button 
              onClick={() => setActiveTab('exact_amount')}
              className={`text-left px-4 py-3 text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'exact_amount' ? 'bg-white text-blue-600 border-l-4 border-l-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 border-l-4 border-l-transparent'}`}
            >
              <Code2 className="w-4 h-4" />
              Giá trị riêng
            </button>
            <button 
              onClick={() => setActiveTab('pay_for_others')}
              className={`text-left px-4 py-3 text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'pay_for_others' ? 'bg-white text-blue-600 border-l-4 border-l-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 border-l-4 border-l-transparent'}`}
            >
              <Code2 className="w-4 h-4" />
              Báo hộ
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            {activeTab === 'smtp' && (
              <div className="flex flex-col gap-4 max-w-lg">
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
                  <label className="text-xs font-semibold text-slate-500 uppercase">Tài khoản Email gửi đi</label>
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
                </div>
              </div>
            )}

            {activeTab !== 'smtp' && (
              <div className="flex flex-col gap-4">
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl mb-2 text-sm text-blue-800">
                  <p className="font-semibold mb-1">Các biến có thể sử dụng:</p>
                  <ul className="list-disc pl-5 space-y-1 text-blue-700/80">
                    <li><code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900 font-bold">{"{{payer_name}}"}</code> : Tên người báo cơm</li>
                    <li><code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900 font-bold">{"{{total_amount}}"}</code> : Tổng số tiền</li>
                    <li><code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900 font-bold">{"{{description}}"}</code> : Chi tiết / ghi chú</li>
                    <li><code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900 font-bold">{"{{participant_count}}"}</code> : Tổng số người tham gia</li>
                    <li><code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900 font-bold">{"{{participants_table}}"}</code> : Danh sách chi tiết số tiền từng người bị trừ (dạng bảng)</li>
                  </ul>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Tiêu đề (Subject)</label>
                  <Input 
                    value={config.templates?.[activeTab]?.subject || ''}
                    onChange={e => setConfig({
                      ...config, 
                      templates: {
                        ...config.templates,
                        [activeTab]: {
                          ...config.templates?.[activeTab],
                          subject: e.target.value
                        }
                      }
                    })}
                    className="mt-1 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Nội dung HTML (Body)</label>
                  <Textarea 
                    value={config.templates?.[activeTab]?.html || ''}
                    onChange={e => setConfig({
                      ...config, 
                      templates: {
                        ...config.templates,
                        [activeTab]: {
                          ...config.templates?.[activeTab],
                          html: e.target.value
                        }
                      }
                    })}
                    className="mt-1 rounded-xl font-mono text-sm h-64 bg-slate-50 resize-y"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-slate-50/50 flex justify-end gap-3 rounded-b-2xl">
          <Button 
            className="w-40 rounded-xl bg-slate-900" 
            onClick={handleSave}
            disabled={loading || testing}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Lưu Cấu Hình
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
