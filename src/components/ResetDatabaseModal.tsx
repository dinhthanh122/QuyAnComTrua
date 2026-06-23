'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Trash2, AlertTriangle } from 'lucide-react';
import { resetDatabaseAction } from '@/app/actions/system_settings';

export function ResetDatabaseModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleReset = async () => {
    if (confirmText !== 'XOA') {
      alert('Vui lòng gõ chữ XOA (viết hoa) để xác nhận');
      return;
    }
    if (!confirm('Hành động này KHÔNG THỂ HOÀN TÁC. Bạn có chắc chắn muốn xóa hết dữ liệu quỹ không?')) return;
    
    setLoading(true);
    try {
      await resetDatabaseAction();
      alert('Đã xóa sạch dữ liệu và bộ nhớ đệm (Cache) thành công!');
      setOpen(false);
      window.location.reload();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
      setConfirmText('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="w-full outline-none">
        <div className="w-full h-14 rounded-xl text-base border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 shadow-sm flex items-center justify-center font-semibold transition-colors cursor-pointer">
          <Trash2 className="w-5 h-5 mr-2" />
          Reset Dữ Liệu
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" /> Khôi phục Cài đặt gốc
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 text-slate-600 text-sm">
          <p className="mb-2 font-medium">Hành động này sẽ thực hiện:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Xóa toàn bộ lịch sử nạp/rút quỹ.</li>
            <li>Xóa toàn bộ lịch sử báo cơm.</li>
            <li>Đưa số dư của tất cả thành viên về 0 VNĐ.</li>
            <li className="text-emerald-600">Danh sách thành viên và các cài đặt khác vẫn được giữ nguyên.</li>
          </ul>
          
          <div className="bg-red-50 p-4 rounded-xl border border-red-200 mb-4">
            Để xác nhận xóa, vui lòng gõ chữ <strong className="text-red-600 text-lg mx-1">XOA</strong> vào ô bên dưới:
            <input 
              type="text" 
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              className="mt-3 w-full p-3 border border-red-200 rounded-xl text-center font-bold text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white shadow-inner"
              placeholder="Gõ chữ XOA (viết hoa)"
              disabled={loading}
            />
          </div>

          <Button 
            onClick={handleReset} 
            disabled={loading || confirmText !== 'XOA'} 
            className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl h-12 text-base font-bold shadow-sm"
          >
            {loading ? 'Đang xóa dữ liệu...' : 'XÓA SẠCH DỮ LIỆU & CACHE'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
