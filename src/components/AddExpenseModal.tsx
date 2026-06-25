'use client';

import { useState, useEffect, useRef } from 'react';
import { Member, addExpense, checkDuplicateExpense, ParticipantSplit } from '@/app/actions/expense';
import { getSystemConfig } from '@/app/actions/system_settings';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { PlusCircle, Loader2, Search, Minus, Plus } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { ScrollArea } from './ui/scroll-area';
import { useRouter } from 'next/navigation';

export function AddExpenseModal({ members }: { members: Member[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const isSelectClosing = useRef(false);
  
  const [totalAmount, setTotalAmount] = useState('');
  const [payerId, setPayerId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [payerSearch, setPayerSearch] = useState('');
  
  const [participants, setParticipants] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<'equal' | 'portions' | 'exact_amount' | 'pay_for_others'>('equal');
  const [advancedSplits, setAdvancedSplits] = useState<Record<string, { portions: number, sponsor_id: string | null }>>({});
  const [warningThreshold, setWarningThreshold] = useState<number>(100000);

  useEffect(() => {
    if (open) {
      setTotalAmount('');
      setPayerId('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setSearch('');
      setPayerSearch('');
      setParticipants([]);
      setSplitMode('equal');
      setAdvancedSplits({});
      getSystemConfig().then(cfg => {
        if (cfg && cfg.expense_warning_threshold !== undefined) {
          setWarningThreshold(cfg.expense_warning_threshold);
        }
      });
      setShowConfirm(false);
      setIsDuplicate(false);
      isSelectClosing.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (splitMode === 'exact_amount') {
      const sum = participants.reduce((acc, id) => acc + (advancedSplits[id]?.portions || 0), 0);
      if (sum > 0) {
        setTotalAmount(sum.toLocaleString('vi-VN'));
      }
    }
  }, [advancedSplits, participants, splitMode]);

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleParticipant = (id: string) => {
    if (isSelectClosing.current) return;
    if (splitMode === 'pay_for_others' && id === payerId) return;

    setParticipants(prev => {
      if (prev.includes(id)) {
        return prev.filter(p => p !== id);
      } else {
        if (splitMode === 'portions') {
          setAdvancedSplits(s => ({ ...s, [id]: { portions: 1, sponsor_id: null } }));
        } else if (splitMode === 'exact_amount') {
          setAdvancedSplits(s => ({ ...s, [id]: { portions: 0, sponsor_id: null } }));
        }
        return [...prev, id];
      }
    });
  };

  const handlePayerChange = (v: string | null) => {
    isSelectClosing.current = true;
    setTimeout(() => isSelectClosing.current = false, 200);

    if (splitMode !== 'pay_for_others' && v && !participants.includes(v)) {
      if (splitMode === 'portions') {
        setAdvancedSplits(s => ({ ...s, [v]: { portions: 1, sponsor_id: null } }));
      } else if (splitMode === 'exact_amount') {
        setAdvancedSplits(s => ({ ...s, [v]: { portions: 0, sponsor_id: null } }));
      }
    }

    setParticipants(prev => {
      let next = [...prev];
      if (splitMode === 'pay_for_others') {
        next = next.filter(p => p !== v);
      } else if (v && !next.includes(v)) {
        next.push(v);
      }
      return next;
    });
    setPayerId(v || '');

    setTimeout(() => {
      const el = document.getElementById(`participant-container-${v}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const selectAll = () => {
    const validMembers = splitMode === 'pay_for_others' ? members.filter(m => m.id !== payerId) : members;
    if (participants.length === validMembers.length) {
      setParticipants(splitMode === 'equal' && payerId ? [payerId] : []);
    } else {
      setParticipants(validMembers.map(m => m.id));
      if (splitMode === 'portions' || splitMode === 'exact_amount') {
        const newSplits = { ...advancedSplits };
        validMembers.forEach(m => {
          if (!newSplits[m.id]) {
            newSplits[m.id] = { portions: splitMode === 'portions' ? 1 : 0, sponsor_id: null };
          }
        });
        setAdvancedSplits(newSplits);
      }
    }
  };

  const getFinalSplits = (): ParticipantSplit[] => {
    return participants.map(id => {
      if (splitMode === 'equal' || splitMode === 'pay_for_others') {
        return { user_id: id, portions: 1, sponsor_id: null };
      }
      return {
        user_id: id,
        portions: advancedSplits[id]?.portions || 1,
        sponsor_id: null
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totalAmount || !payerId || participants.length === 0) return;
    
    setLoading(true);
    try {
      const isDup = await checkDuplicateExpense({
        total_amount: Number(totalAmount.replace(/\D/g, '')),
        splits: getFinalSplits(),
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
        splits: getFinalSplits(),
        date: date
      });
      setOpen(false);
      // Reset is handled by useEffect
      router.refresh();
    } catch (error: any) {
      alert('Có lỗi xảy ra: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  const calculatePreview = () => {
    const total = Number(totalAmount.replace(/\D/g, ''));
    if (!total) return null;
    
    const splits = getFinalSplits();
    const total_portions = splits.reduce((acc, curr) => acc + curr.portions, 0);
    if (total_portions === 0) return null;

    const portionPrice = total / total_portions;
    const netChanges: Record<string, number> = {};
    netChanges[payerId] = total;

    for (const split of splits) {
      const cost = split.portions * portionPrice;
      const responsible_id = split.sponsor_id || split.user_id;
      netChanges[responsible_id] = (netChanges[responsible_id] || 0) - cost;
    }

    return { total_portions, portionPrice, netChanges };
  };

  const preview = showConfirm ? calculatePreview() : null;
  const isWarningCost = preview && warningThreshold > 0 && preview.portionPrice > warningThreshold;

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
        className="sm:max-w-lg w-[95vw] rounded-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col"
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
                {isWarningCost && preview && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
                    <div className="font-bold text-red-800 flex items-center gap-2">
                      <span className="text-xl">⚠️</span> Cảnh báo chi phí cao bất thường
                    </div>
                    <div className="text-sm text-red-700">
                      Đơn giá mỗi suất hiện tại là <strong>{Math.round(preview.portionPrice).toLocaleString('vi-VN')}đ</strong>, vượt quá mức cảnh báo cấu hình ({warningThreshold.toLocaleString('vi-VN')}đ/suất). Vui lòng kiểm tra lại xem có nhập dư số 0 không nhé!
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
                      const adv = (splitMode === 'portions' || splitMode === 'exact_amount') ? advancedSplits[id] : null;
                      return (
                        <span key={id} className="inline-flex px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-sm text-slate-700">
                          {m?.name} 
                          {adv && splitMode === 'portions' && adv.portions !== 1 ? ` (${adv.portions} suất)` : ''}
                          {adv && splitMode === 'exact_amount' ? ` - ${adv.portions.toLocaleString('vi-VN')}đ` : ''}
                        </span>
                      );
                    })}
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl mt-4 space-y-3">
                  {preview && (
                    <div className="space-y-2">
                      {splitMode !== 'exact_amount' && (
                        <>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Tổng số suất:</span>
                            <span className="font-bold text-slate-700">{preview.total_portions} suất</span>
                          </div>
                          <div className="flex justify-between items-center text-sm border-b border-blue-200 pb-2">
                            <span className="text-slate-500">Đơn giá mỗi suất:</span>
                            <span className="font-bold text-slate-700">{Math.round(preview.portionPrice).toLocaleString('vi-VN')} VNĐ</span>
                          </div>
                        </>
                      )}
                      <div className="pt-2">
                        <div className="text-sm font-semibold text-slate-700 mb-2">Thay đổi số dư dự kiến:</div>
                        {Object.entries(preview.netChanges).map(([uid, change]) => {
                          if (change === 0) return null;
                          const mName = members.find(m => m.id === uid)?.name || 'Ai đó';
                          return (
                            <div key={uid} className="flex justify-between items-center text-sm py-1">
                              <span className="text-slate-600">{mName}</span>
                              <span className={`font-bold ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {change > 0 ? '+' : ''}{Math.round(change).toLocaleString('vi-VN')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
                    readOnly={splitMode === 'exact_amount'}
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

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="space-y-3">
                    <Label className="text-slate-700 font-semibold text-sm">Chế độ chia tiền</Label>
                    <RadioGroup 
                      value={splitMode} 
                      onValueChange={(val: any) => {
                        setSplitMode(val);
                        setAdvancedSplits({});
                        setTotalAmount('');
                        if (val === 'pay_for_others') {
                          setParticipants([]);
                        } else {
                          setParticipants(payerId ? [payerId] : []);
                          if (payerId) {
                            if (val === 'portions') {
                              setAdvancedSplits({ [payerId]: { portions: 1, sponsor_id: null } });
                            } else if (val === 'exact_amount') {
                              setAdvancedSplits({ [payerId]: { portions: 0, sponsor_id: null } });
                            }
                          }
                        }
                      }}
                      className="grid grid-cols-2 gap-3"
                    >
                      <Label htmlFor="mode-equal" className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${splitMode === 'equal' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                        <RadioGroupItem value="equal" id="mode-equal" className="border-slate-300 aria-checked:border-orange-600 aria-checked:bg-orange-600" />
                        <span className="text-sm font-medium">Chia đều</span>
                      </Label>
                      <Label htmlFor="mode-portions" className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${splitMode === 'portions' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                        <RadioGroupItem value="portions" id="mode-portions" className="border-slate-300 aria-checked:border-orange-600 aria-checked:bg-orange-600" />
                        <span className="text-sm font-medium">Báo theo số lượng</span>
                      </Label>
                      <Label htmlFor="mode-exact-amount" className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${splitMode === 'exact_amount' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                        <RadioGroupItem value="exact_amount" id="mode-exact-amount" className="border-slate-300 aria-checked:border-orange-600 aria-checked:bg-orange-600" />
                        <span className="text-sm font-medium">Báo theo giá trị riêng</span>
                      </Label>
                      <Label htmlFor="mode-pay-others" className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${splitMode === 'pay_for_others' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                        <RadioGroupItem value="pay_for_others" id="mode-pay-others" className="border-slate-300 aria-checked:border-orange-600 aria-checked:bg-orange-600" />
                        <span className="text-sm font-medium">Báo hộ (Không ăn)</span>
                      </Label>
                    </RadioGroup>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-slate-600">Những người tham gia ăn ({participants.length})</Label>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={selectAll} className="text-orange-600 h-8 px-2">
                        {participants.length === members.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                      </Button>
                    </div>
                  </div>
                  
                  {splitMode === 'exact_amount' && (
                    <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded-lg border border-blue-100 mb-2">
                      💡 <b>Nhập số tiền riêng</b> cho từng người. Tổng tiền sẽ tự động được tính.
                    </div>
                  )}
                  {splitMode === 'pay_for_others' && (
                    <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded-lg border border-blue-100 mb-2">
                      💡 Danh sách bên dưới đã được <b>loại bỏ</b> tên của người thanh toán (vì người này chỉ trả tiền hộ chứ không ăn).
                    </div>
                  )}

                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Tìm tên..." 
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-9 h-10 rounded-lg bg-slate-50"
                    />
                  </div>

                  <ScrollArea className="h-[250px] border rounded-xl p-2 bg-slate-50/50">
                    <div className="space-y-1">
                    {filteredMembers.map(member => {
                      const isSelected = participants.includes(member.id);
                      const defaultPortions = splitMode === 'exact_amount' ? 0 : 1;
                      const advancedData = advancedSplits[member.id] || { portions: defaultPortions, sponsor_id: null };
                      return (
                      <div 
                        key={member.id} 
                        id={`participant-container-${member.id}`}
                        className={`flex flex-col p-3 rounded-lg transition-colors ${isSelected ? 'bg-orange-50/50 border border-orange-100' : 'hover:bg-slate-100'} ${splitMode === 'pay_for_others' && member.id === payerId ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox 
                            id={`participant-${member.id}`} 
                            checked={isSelected}
                            disabled={splitMode === 'pay_for_others' && member.id === payerId}
                            onCheckedChange={() => {
                              if (!isSelectClosing.current) toggleParticipant(member.id);
                            }}
                            className="w-5 h-5 rounded-md data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                          />
                          <label 
                            htmlFor={`participant-${member.id}`} 
                            onClick={(e) => {
                              if (isSelectClosing.current) e.preventDefault();
                            }}
                            className="font-medium text-slate-700 select-none flex-1 cursor-pointer"
                          >
                            {member.name}
                          </label>
                        </div>
                        
                        {isSelected && (splitMode === 'portions' || splitMode === 'exact_amount') && (
                          <div className="mt-3 pl-8 space-y-3">
                            {splitMode === 'portions' && (
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-500 w-16">Số suất:</span>
                                <div className="flex items-center gap-2 bg-white border rounded-lg p-1">
                                  <button type="button" onClick={() => setAdvancedSplits(s => ({ ...s, [member.id]: { portions: Math.max(1, (s[member.id]?.portions || 1) - 1), sponsor_id: null } }))} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600"><Minus className="w-3 h-3"/></button>
                                  <span className="text-sm font-medium w-6 text-center">{advancedData.portions}</span>
                                  <button type="button" onClick={() => setAdvancedSplits(s => ({ ...s, [member.id]: { portions: (s[member.id]?.portions || 1) + 1, sponsor_id: null } }))} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600"><Plus className="w-3 h-3"/></button>
                                </div>
                              </div>
                            )}
                            {splitMode === 'exact_amount' && (
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-500 w-16">Số tiền:</span>
                                <div className="flex items-center gap-2">
                                  <Input 
                                    placeholder="Ví dụ: 35000"
                                    value={advancedData.portions ? advancedData.portions.toLocaleString('vi-VN') : ''}
                                    onChange={(e) => {
                                      const val = Number(e.target.value.replace(/\D/g, ''));
                                      setAdvancedSplits(s => ({ ...s, [member.id]: { portions: val, sponsor_id: null } }));
                                    }}
                                    className="h-8 w-32 bg-white"
                                  />
                                  <span className="text-sm text-slate-500">đ</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )})}
                    {filteredMembers.length === 0 && (
                      <div className="text-center text-sm text-slate-500 py-4">Không tìm thấy người này.</div>
                    )}
                    </div>
                  </ScrollArea>
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
