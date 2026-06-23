'use client';

import { useState, useEffect } from 'react';
import { Member, addExpense, checkDuplicateExpense } from '@/app/actions/expense';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { PlusCircle, Loader2, Search } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import { useRouter } from 'next/navigation';

export function AddExpenseModal({ members }: { members: Member[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isSelectClosing, setIsSelectClosing] = useState(false);
  
  const [totalAmount, setTotalAmount] = useState('');
  const [payerId, setPayerId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [payerSearch, setPayerSearch] = useState('');
  
  const [participants, setParticipants] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setTotalAmount('');
      setPayerId('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setParticipants([]);
      setSearch('');
      setPayerSearch('');
      setShowConfirm(false);
      setIsDuplicate(false);
      setIsSelectClosing(false);
    }
  }, [open]);

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleParticipant = (id: string) => {
    if (isSelectClosing) return;
    if (id === payerId && participants.includes(id)) {
      alert("Người thanh toán hộ bắt buộc phải tham gia bữa ăn này!");
      return;
    }
    setParticipants(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handlePayerChange = (v: string) => {
    setIsSelectClosing(true);
    setTimeout(() => setIsSelectClosing(false), 200);

    setParticipants(prev => {
      let next = [...prev];
      // Tích người mới (người thanh toán hộ luôn phải tham gia)
      if (v && !next.includes(v)) {
        next.push(v);
      }
      return next;
    });
    setPayerId(v);

    setTimeout(() => {
      const el = document.getElementById(`participant-container-${v}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const selectAll = () => {
    if (participants.length === members.length) {
      setParticipants(payerId ? [payerId] : []);
    } else {
      setParticipants(members.map(m => m.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totalAmount || !payerId || participants.length === 0) return;
    
    setLoading(true);
    try {
      const isDup = await checkDuplicateExpense({
        total_amount: Number(totalAmount.replace(/\D/g, '')),
        participants: participants,
        date: date
      });
      setIsDuplicate(isDup);
      setShowConfirm(true);
    } catch (err) {
      console.error('Error checking duplicate:', err);
      setIsDuplicate(false);
      setShowConfirm(true);
    } finally {
      setLoading(false);
    }
  };

  const executeSubmit = async () => {
    setLoading(true);
    try {
      await addExpense({
        payer_id: payerId,
        total_amount: Number(totalAmount.replace(/\D/g, '')),
        description: description || 'Ăn trưa',
        participants: participants,
        date: date
      });
      setOpen(false);
      // Reset form
      setTotalAmount('');
      setPayerId('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setParticipants([]);
      setSearch('');
      setPayerSearch('');
      setShowConfirm(false);
      router.refresh();
    } catch (error: any) {
      alert('Có lỗi xảy ra: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) setShowConfirm(false);
    }} disablePointerDismissal>
      <DialogTrigger className="w-full mb-3 outline-none">
        <div className="w-full h-14 rounded-xl text-base bg-orange-500 hover:bg-orange-600 shadow-md flex items-center justify-center text-white font-semibold transition-colors cursor-pointer">
          <PlusCircle className="w-5 h-5 mr-2" />
          Thêm bữa ăn mới
        </div>
      </DialogTrigger>
      <DialogContent 
        className="sm:max-w-md w-[95vw] rounded-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col"
      >
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl">
            {showConfirm ? 'Xác nhận thông tin' : 'Thêm bữa ăn mới'}
          </DialogTitle>
        </DialogHeader>
        
        {showConfirm ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 px-6 pb-6 overflow-y-auto">
              <div className="space-y-4 mt-2">
                {isDuplicate && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl space-y-2">
                    <div className="font-bold text-yellow-800 flex items-center gap-2">
                      <span className="text-xl">⚠️</span> Cảnh báo trùng lặp
                    </div>
                    <div className="text-sm text-yellow-700">
                      Hệ thống phát hiện bạn đã tạo một hóa đơn y hệt (cùng số tiền và cùng những người tham gia này) trong ngày {new Date(date).toLocaleDateString('vi-VN')}. Bạn có chắc chắn muốn báo thêm lần nữa?
                    </div>
                  </div>
                )}
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Tổng tiền:</span>
                    <span className="text-lg font-bold text-orange-700">{totalAmount}đ</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Người thanh toán hộ:</span>
                    <span className="font-semibold text-slate-800">
                      {members.find(m => m.id === payerId)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Số người tham gia:</span>
                    <span className="font-semibold text-slate-800">{participants.length} người</span>
                  </div>
                  {description && (
                    <div className="flex justify-between items-center border-t border-orange-100 pt-3 mt-3">
                      <span className="text-sm text-slate-500">Ghi chú:</span>
                      <span className="text-sm font-medium text-slate-700">{description}</span>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Danh sách người tham gia:</h4>
                  <div className="flex flex-wrap gap-2">
                    {participants.map(id => {
                      const m = members.find(m => m.id === id);
                      return (
                        <span key={id} className="inline-flex px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-sm text-slate-700">
                          {m?.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl mt-4 space-y-3">
                  <div className="text-center">
                    <div className="text-sm text-slate-500 mb-1">Mỗi người phải trả</div>
                    <div className="text-xl font-bold text-red-600">
                      -{participants.length > 0 ? Math.round(Number(totalAmount.replace(/\D/g, '')) / participants.length).toLocaleString('vi-VN') : 0} VNĐ
                    </div>
                  </div>
                  {(() => {
                    if (participants.length === 0) return null;
                    const total = Number(totalAmount.replace(/\D/g, ''));
                    const amountPerPerson = Math.round(total / participants.length);
                    const payerGetsBack = participants.includes(payerId) ? total - amountPerPerson : total;
                    const payerName = members.find(m => m.id === payerId)?.name || '';
                    return (
                      <div className="text-center pt-3 border-t border-blue-200">
                        <div className="text-sm text-slate-500 mb-1"><span className="font-semibold">{payerName}</span> sẽ được cộng vào</div>
                        <div className="text-xl font-bold text-green-600">
                          +{Math.round(payerGetsBack).toLocaleString('vi-VN')} VNĐ
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </ScrollArea>
            
            <div className="p-4 bg-white border-t mt-auto shadow-[0_-10px_40px_rgba(0,0,0,0.05)] flex gap-3">
              <Button 
                variant="outline"
                disabled={loading}
                onClick={() => setShowConfirm(false)}
                className="flex-1 h-14 rounded-xl text-lg font-semibold"
              >
                Quay lại sửa
              </Button>
              <Button 
                onClick={executeSubmit}
                disabled={loading} 
                className="flex-1 h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg text-lg font-semibold"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Báo cơm'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-6 pb-6 overflow-y-auto">
              <form id="expense-form" onSubmit={handleSubmit} className="space-y-5 mt-2">
                
                <div className="space-y-2">
                  <Label className="text-slate-600">Tổng tiền hóa đơn</Label>
                  <Input 
                    type="text" 
                    required 
                    placeholder="Ví dụ: 250.000" 
                    value={totalAmount}
                    onChange={e => {
                      const rawValue = e.target.value.replace(/\D/g, '');
                      if (!rawValue) {
                        setTotalAmount('');
                      } else {
                        setTotalAmount(Number(rawValue).toLocaleString('vi-VN'));
                      }
                    }}
                    className="h-12 rounded-xl text-lg font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-600">Ngày ăn</Label>
                  <Input 
                    type="date" 
                    required 
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="h-12 rounded-xl text-lg font-medium text-slate-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-600">Người thanh toán hộ</Label>
                  <Select value={payerId} onValueChange={handlePayerChange} required>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Chọn người trả">
                        {payerId ? members.find(m => m.id === payerId)?.name : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false} sideOffset={4} className="max-h-[350px] flex flex-col p-1 rounded-xl shadow-xl">
                      <div className="p-2 sticky top-0 bg-white z-10 border-b mb-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <Input 
                            placeholder="Tìm người trả..." 
                            value={payerSearch} 
                            onChange={e => setPayerSearch(e.target.value)}
                            onKeyDown={e => e.stopPropagation()}
                            className="pl-9 h-10 rounded-lg bg-slate-50 border-transparent focus:bg-white transition-colors"
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto px-1">
                        {members
                          .filter(m => m.name.toLowerCase().includes(payerSearch.toLowerCase()))
                          .map(m => (
                          <SelectItem 
                            key={m.id} 
                            value={m.id}
                            className="cursor-pointer py-3 px-3 focus:bg-orange-50 focus:text-orange-700 rounded-lg my-0.5 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-white text-slate-600 flex items-center justify-center font-bold text-xs shadow-sm border border-slate-100">
                                {m.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium">{m.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                        {members.filter(m => m.name.toLowerCase().includes(payerSearch.toLowerCase())).length === 0 && (
                          <div className="py-4 text-center text-sm text-slate-500">Không tìm thấy</div>
                        )}
                      </div>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-600">Ghi chú bữa ăn</Label>
                  <Input 
                    placeholder="Ví dụ: Bún chả" 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-slate-600">Những người tham gia ăn ({participants.length})</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={selectAll} className="text-orange-600 h-8 px-2">
                      {participants.length === members.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                    </Button>
                  </div>
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Tìm tên..." 
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-9 h-10 rounded-lg bg-slate-50"
                    />
                  </div>

                  <div className="border rounded-xl p-2 bg-slate-50/50 max-h-[180px] overflow-y-auto space-y-1">
                    {filteredMembers.map(member => (
                      <div 
                        key={member.id} 
                        id={`participant-container-${member.id}`}
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <Checkbox 
                          id={`participant-${member.id}`} 
                          checked={participants.includes(member.id)}
                          onCheckedChange={() => {
                            if (!isSelectClosing) toggleParticipant(member.id);
                          }}
                          className="w-5 h-5 rounded-md data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                        />
                        <label 
                          htmlFor={`participant-${member.id}`} 
                          onClick={(e) => {
                            if (isSelectClosing) e.preventDefault();
                          }}
                          className="font-medium text-slate-700 select-none flex-1 cursor-pointer"
                        >
                          {member.name}
                        </label>
                      </div>
                    ))}
                    {filteredMembers.length === 0 && (
                      <div className="text-center text-sm text-slate-500 py-4">Không tìm thấy người này.</div>
                    )}
                  </div>
                </div>

              </form>
            </ScrollArea>
            
            <div className="p-4 bg-white border-t mt-auto shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <Button 
                 type="submit" 
                 form="expense-form"
                 disabled={loading || participants.length === 0 || !totalAmount || !payerId} 
                 className="w-full h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg text-lg font-semibold"
               >
                 {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Báo cơm'}
               </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
