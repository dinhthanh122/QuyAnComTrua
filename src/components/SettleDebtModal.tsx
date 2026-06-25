'use client';

import { useState } from 'react';
import { Member } from '@/app/actions/expense';
import { processFundTransaction } from '@/app/actions/fund';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowRightLeft, Loader2, ArrowDownToLine, ArrowUpFromLine, Search, CheckCircle2 } from 'lucide-react';
import { removeAccents } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export function SettleDebtModal({ members }: { members: Member[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'NAP_QUY' | 'RUT_QUY'>('NAP_QUY');
  const [userId, setUserId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [amount, setAmount] = useState('');
  const [confirming, setConfirming] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !amount) return;

    const numAmount = Number(amount.replace(/\D/g, ''));

    if (type === 'RUT_QUY') {
      const selectedMember = members.find(m => m.id === userId);
      if (!selectedMember || selectedMember.balance <= 0) {
        alert('Thành viên này đang âm quỹ hoặc số dư bằng 0, không thể rút!');
        return;
      }
      if (numAmount > selectedMember.balance) {
        alert(`Không thể rút! Số tiền yêu cầu vượt quá số dư hiện tại (${selectedMember.balance.toLocaleString('vi-VN')}đ).`);
        return;
      }
    }

    if (!confirming) {
      setConfirming(true);
      return;
    }

    setLoading(true);
    try {
      await processFundTransaction({
        user_id: userId,
        amount: numAmount,
        type
      });
      setOpen(false);
      setConfirming(false);
      setUserId('');
      setUserSearch('');
      setAmount('');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Có lỗi xảy ra!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="w-full outline-none">
        <div className="w-full h-14 rounded-xl text-base border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 shadow-sm flex items-center justify-center font-semibold transition-colors cursor-pointer">
          <ArrowRightLeft className="w-5 h-5 mr-2" />
          Nạp / Rút Tổng Quỹ
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl">Giao dịch Quỹ</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          
          {confirming ? (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center shadow-sm">
                <div className="text-slate-500 mb-2 font-medium">Bạn đang yêu cầu</div>
                <div className={`font-black text-2xl mb-2 ${type === 'NAP_QUY' ? 'text-green-600' : 'text-orange-600'}`}>
                  {type === 'NAP_QUY' ? 'Nạp Quỹ' : 'Rút Quỹ'}
                </div>
                <div className="font-extrabold text-4xl mb-4 text-slate-800 tracking-tight">{amount} đ</div>
                <div className="text-slate-500 mb-1">Cho thành viên:</div>
                <div className="font-bold text-xl text-blue-900">{members.find(m => m.id === userId)?.name}</div>
                
                <div className="mt-4 pt-4 border-t border-slate-200 text-sm text-slate-500">
                  Một email thông báo sẽ được gửi tự động đến thành viên này.
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  disabled={loading} 
                  onClick={() => setConfirming(false)} 
                  className="flex-1 h-12 rounded-xl text-slate-600"
                >
                  Quay lại sửa
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md text-base"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Xác nhận ngay'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-slate-600">Loại giao dịch</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-colors ${type === 'NAP_QUY' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    onClick={() => setType('NAP_QUY')}
                  >
                    <ArrowDownToLine className="w-6 h-6 mb-1" />
                    <span className="font-medium">Nạp Quỹ</span>
                    <span className="text-xs opacity-80">(Thành viên đóng)</span>
                  </div>
                  <div 
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-colors ${type === 'RUT_QUY' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    onClick={() => setType('RUT_QUY')}
                  >
                    <ArrowUpFromLine className="w-6 h-6 mb-1" />
                    <span className="font-medium">Rút Quỹ</span>
                    <span className="text-xs opacity-80">(Quỹ trả lại)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-600">Thành viên</Label>
                <Select value={userId} onValueChange={(v) => setUserId(v || '')} required>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Chọn thành viên">
                      {userId ? members.find(m => m.id === userId)?.name : null}
                    </SelectValue>
                  </SelectTrigger>
                    <SelectContent className="max-h-[350px] flex flex-col p-1 rounded-xl shadow-xl">
                      <div className="p-2 sticky top-0 bg-white z-10 border-b mb-1">
                        <div className="relative">
                          <Input 
                            placeholder="Tìm thành viên..." 
                            value={userSearch} 
                            onChange={e => setUserSearch(e.target.value)}
                            onKeyDown={e => e.stopPropagation()}
                            className="h-10 rounded-lg bg-slate-50 border-transparent focus:bg-white transition-colors"
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto px-1">
                        {members
                          .filter(m => removeAccents(m.name).includes(removeAccents(userSearch)))
                          .map(m => (
                          <SelectItem 
                            key={m.id} 
                            value={m.id}
                            className="cursor-pointer py-3 px-3 focus:bg-blue-50 focus:text-blue-700 rounded-lg my-0.5 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-white text-slate-600 flex items-center justify-center font-bold text-xs shadow-sm border border-slate-100">
                                {m.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium">{m.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      {members.filter(m => removeAccents(m.name).includes(removeAccents(userSearch))).length === 0 && (
                        <div className="py-4 text-center text-sm text-slate-500">Không tìm thấy</div>
                      )}
                    </div>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-600">Số tiền (VNĐ)</Label>
                <Input 
                  type="text" 
                  required 
                  placeholder="Ví dụ: 50.000" 
                  value={amount}
                  onChange={e => {
                    const rawValue = e.target.value.replace(/\D/g, '');
                    if (!rawValue) {
                      setAmount('');
                    } else {
                      setAmount(Number(rawValue).toLocaleString('vi-VN'));
                    }
                  }}
                  className="h-12 rounded-xl text-lg"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md text-base mt-4">
                Tiếp tục
              </Button>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
