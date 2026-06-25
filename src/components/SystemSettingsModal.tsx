'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Settings, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { getSystemConfig, saveSystemConfig, SystemConfig, WarningThreshold, DEFAULT_THRESHOLDS } from '@/app/actions/system_settings';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';

export function SystemSettingsModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const cfg = await getSystemConfig();
      setConfig(cfg);
      setErrorMsg('');
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Lỗi không xác định khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await saveSystemConfig(config);
      setOpen(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const addThreshold = () => {
    if (!config) return;
    const newThreshold: WarningThreshold = {
      id: Math.random().toString(36).substr(2, 9),
      amount: 100000,
      message: 'Cảnh báo chi phí cao'
    };
    setConfig({
      ...config,
      expense_warning_thresholds: [...(config.expense_warning_thresholds || []), newThreshold].sort((a, b) => a.amount - b.amount)
    });
  };

  const updateThreshold = (id: string, field: keyof WarningThreshold, value: any) => {
    if (!config || !config.expense_warning_thresholds) return;
    const updated = config.expense_warning_thresholds.map(t => {
      if (t.id === id) {
        return { ...t, [field]: value };
      }
      return t;
    }).sort((a, b) => a.amount - b.amount);
    setConfig({ ...config, expense_warning_thresholds: updated });
  };

  const removeThreshold = (id: string) => {
    if (!config || !config.expense_warning_thresholds) return;
    setConfig({
      ...config,
      expense_warning_thresholds: config.expense_warning_thresholds.filter(t => t.id !== id)
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="w-full outline-none">
        <div className="w-full h-14 rounded-xl text-base border border-slate-200 text-slate-700 bg-white hover:bg-slate-100 shadow-sm flex items-center justify-center font-semibold transition-colors">
          <Settings className="w-5 h-5 mr-2 text-slate-500" />
          Cài đặt hệ thống
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cài đặt hệ thống</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : errorMsg ? (
          <div className="p-6 text-center text-red-500">
            <p>Có lỗi xảy ra: {errorMsg}</p>
            <p className="text-sm mt-2 text-slate-500">Hãy thử tải lại trang bằng F5 hoặc Ctrl+F5.</p>
          </div>
        ) : config ? (
          <div className="space-y-6 mt-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="space-y-0.5">
                <Label className="text-base">Mã PIN khi xóa lịch sử</Label>
                <div className="text-sm text-slate-500">
                  Yêu cầu nhập mã PIN khi xóa giao dịch (123456)
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={config.require_pin_for_history} 
                  onChange={e => setConfig({...config, require_pin_for_history: e.target.checked})} 
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold text-slate-800">Các mức cảnh báo chi phí</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addThreshold}
                  className="h-8 px-2 text-xs rounded-lg bg-white"
                >
                  <Plus className="w-4 h-4 mr-1" /> Thêm mức
                </Button>
              </div>
              <div className="text-sm text-slate-500">
                Khi đơn giá 1 suất ăn vượt các ngưỡng dưới đây, hệ thống sẽ hiển thị thông báo tương ứng.
              </div>

              <div className="space-y-3 mt-2">
                {config.expense_warning_thresholds?.map((threshold) => (
                  <div key={threshold.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative group">
                    <button 
                      onClick={() => removeThreshold(threshold.id)}
                      className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="pr-8">
                      <Label className="text-xs text-slate-500 mb-1 block">Ngưỡng số tiền (VNĐ)</Label>
                      <Input 
                        type="number" 
                        value={threshold.amount || ''}
                        onChange={(e) => updateThreshold(threshold.id, 'amount', parseInt(e.target.value) || 0)}
                        className="h-10 bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Nội dung thông báo</Label>
                      <Input 
                        value={threshold.message}
                        onChange={(e) => updateThreshold(threshold.id, 'message', e.target.value)}
                        className="h-10 bg-white"
                        placeholder="Nhập thông báo hiển thị..."
                      />
                    </div>
                  </div>
                ))}
                
                {(!config.expense_warning_thresholds || config.expense_warning_thresholds.length === 0) && (
                  <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    Chưa có mức cảnh báo nào
                  </div>
                )}
              </div>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-base font-semibold"
            >
              {saving ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Đang lưu...</>
              ) : (
                <><Save className="w-5 h-5 mr-2" /> Lưu cấu hình</>
              )}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
