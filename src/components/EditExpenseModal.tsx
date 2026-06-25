'use client';

import { useState, useEffect, useRef } from 'react';
import { Member, updateExpense } from '@/app/actions/expense';
import { TransactionHistory } from '@/app/actions/fund';
import { getSystemConfig, WarningThreshold } from '@/app/actions/system_settings';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ParticipantSplit } from '@/app/actions/expense';
import { Loader2, Search, Settings2, Minus, Plus } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { ScrollArea } from './ui/scroll-area';
import { useRouter } from 'next/navigation';

export function EditExpenseModal({ 
  expense, 
  members = [], 
  open, 
  onOpenChange,
  updaterId,
  pinCode,
  onSuccess,
  viewOnly
}: { 
  expense: TransactionHistory | null; 
  members?: Member[]; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  updaterId?: string;
  pinCode?: string;
  onSuccess?: () => void;
  viewOnly?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isSelectClosing = useRef(false);
  
  const [totalAmount, setTotalAmount] = useState('');
  const [payerId, setPayerId] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [payerSearch, setPayerSearch] = useState('');
  
  const [participants, setParticipants] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<'equal' | 'portions' | 'exact_amount' | 'pay_for_others'>('equal');
  const [inputPin, setInputPin] = useState('');
  
  const [advancedSplits, setAdvancedSplits] = useState<Record<string, { portions: number, sponsor_id: string | null }>>({});
  const [warningThresholds, setWarningThresholds] = useState<WarningThreshold[]>([]);

  useEffect(() => {
    if (open && expense) {
      setTotalAmount(expense.amount.toLocaleString('vi-VN'));
      setPayerId(expense.payer_id || '');
      setDescription(expense.description?.split(' | META:')[0] || '');
      
      const pIds = expense.participant_ids || [];
      const splits = expense.splits || [];
      
      setParticipants(pIds);
      
      const adv: Record<string, { portions: number, sponsor_id: string | null }> = {};
      splits.forEach((s: any) => {
        adv[s.user_id] = { portions: s.portions, sponsor_id: s.sponsor_id };
      });
      setAdvancedSplits(adv);

      const hasPayer = splits.some(s => s.user_id === expense.payer_id);
      const isAllEqual = splits.every(s => s.portions === 1);
      
      if (!hasPayer && isAllEqual && splits.length > 0) {
        setSplitMode('pay_for_others');
      } else if (splits.some(s => s.portions > 100)) {
        setSplitMode('exact_amount');
      } else if (splits.some(s => s.portions !== 1)) {
        setSplitMode('portions');
      } else {
        setSplitMode('equal');
      }

      getSystemConfig().then(cfg => {
        if (cfg && cfg.expense_warning_thresholds) {
          setWarningThresholds(cfg.expense_warning_thresholds);
        }
      });

      setInputPin('');
      setShowConfirm(false);
      setShowDeleteConfirm(false);
    }
  }, [open, expense, pinCode]);

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (splitMode === 'exact_amount') {
      const sum = participants.reduce((acc, id) => acc + (advancedSplits[id]?.portions || 0), 0);
      if (sum > 0) {
        setTotalAmount(sum.toLocaleString('vi-VN'));
      }
    }
  }, [advancedSplits, participants, splitMode]);

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

    setPayerId(v || '');
    setParticipants(prev => {
      let next = [...prev];
      if (splitMode === 'pay_for_others') {
        next = next.filter(p => p !== v);
      } else if (v && !next.includes(v)) {
        next.push(v);
      }
      return next;
    });

    setTimeout(() => {
      const el = document.getElementById(`edit-participant-container-${v}`);
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
    return participants.map(id => ({
      user_id: id,
      portions: splitMode === 'equal' || splitMode === 'pay_for_others' ? 1 : (advancedSplits[id]?.portions || 1),
      sponsor_id: null
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totalAmount || !payerId || participants.length === 0) return;
    setShowConfirm(true);
  };

  const executeSubmit = async () => {
    if (!expense) return;
    setLoading(true);
    try {
      await updateExpense({
        expense_id: expense.id,
        payer_id: payerId,
        total_amount: Number(totalAmount.replace(/\D/g, '')),
        description: description,
        splits: getFinalSplits(),
        updater_id: updaterId,
        pin_code: inputPin,
        split_mode: splitMode
      });
      onOpenChange(false);
      setShowConfirm(false);
      if (onSuccess) onSuccess();
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
      netChanges[split.user_id] = (netChanges[split.user_id] || 0) - cost;
    }

    return { total_portions, portionPrice, netChanges };
  };

  const preview = showConfirm ? calculatePreview() : null;
  const activeWarning = preview && warningThresholds?.length > 0 
    ? [...warningThresholds].sort((a, b) => b.amount - a.amount).find(t => preview.portionPrice > t.amount) 
    : null;

  const executeDelete = async () => {
    if (!expense) return;
    setLoading(true);
    try {
      const { deleteExpense } = await import('@/app/actions/expense');
      await deleteExpense({
        expense_id: expense.id,
        updater_id: updaterId,
        pin_code: inputPin
      });
      onOpenChange(false);
      setShowDeleteConfirm(false);
      if (onSuccess) onSuccess();
      router.refresh();
    } catch (error: any) {
      alert('Có lỗi xảy ra: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) {
        setShowConfirm(false);
        setShowDeleteConfirm(false);
      }
    }}>
      <DialogContent className="sm:max-w-lg w-[95vw] rounded-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl">
            {viewOnly ? 'Chi tiết hóa đơn' : (showDeleteConfirm ? 'Xác nhận hủy hóa đơn' : (showConfirm ? 'Xác nhận thông tin sửa đổi' : 'Sửa hóa đơn'))}
          </DialogTitle>
        </DialogHeader>
        
        {showConfirm ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 px-6 pb-6 overflow-y-auto">
              <div className="space-y-4 mt-2">
                {activeWarning && preview && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
                    <div className="font-bold text-red-800 flex items-center gap-2">
                      <span className="text-xl">⚠️</span> {activeWarning.message || 'Cảnh báo chi phí cao bất thường'}
                    </div>
                    <div className="text-sm text-red-700">
                      Đơn giá mỗi suất hiện tại là <strong>{Math.round(preview.portionPrice).toLocaleString('vi-VN')}đ</strong>, vượt qua ngưỡng {activeWarning.amount.toLocaleString('vi-VN')}đ/suất.
                    </div>
                  </div>
                )}
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Tổng tiền mới:</span>
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
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Danh sách tham gia mới:</h4>
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

                {updaterId && (
                  <div className="mt-4 p-4 border border-slate-200 rounded-xl bg-white">
                    <Label className="text-slate-700 mb-2 block font-medium">Xác thực quyền sửa (Mã PIN)</Label>
                    <Input 
                      type="password"
                      placeholder="Nhập mã PIN..."
                      value={inputPin}
                      onChange={e => setInputPin(e.target.value.replace(/\D/g, ''))}
                      maxLength={6}
                      className="text-center tracking-[0.5em] text-lg h-12 rounded-xl"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <div className="p-4 bg-white border-t mt-auto shadow-[0_-10px_40px_rgba(0,0,0,0.05)] flex gap-3">
              {viewOnly ? (
                <Button variant="outline" type="button" onClick={() => onOpenChange(false)} className="flex-1 h-14 rounded-xl text-lg font-semibold bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700">Đóng</Button>
              ) : (
                <>
                  <Button variant="outline" type="button" onClick={() => setShowDeleteConfirm(true)} className="flex-1 h-14 rounded-xl text-lg font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">Hủy hóa đơn</Button>
                  <Button type="submit" disabled={loading} className="flex-1 h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg text-lg font-semibold">
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Lưu thay đổi'}
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : showDeleteConfirm ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 px-6 pb-2 overflow-y-auto">
              <div className="space-y-4 pt-2">
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-center">
                  <p className="text-red-700 font-medium">Bạn có chắc chắn muốn hủy hóa đơn này không?</p>
                </div>
                {updaterId && (
                  <div className="mt-4 p-4 border border-slate-200 rounded-xl bg-white">
                    <Label className="text-slate-700 mb-2 block font-medium">Xác thực mã PIN</Label>
                    <Input type="password" value={inputPin} onChange={e => setInputPin(e.target.value.replace(/\D/g, ''))} maxLength={6} className="text-center tracking-[0.5em] text-lg h-12 rounded-xl" />
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="p-4 bg-white border-t mt-auto flex gap-3">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="flex-1 h-14 rounded-xl text-lg font-semibold">Trở lại</Button>
              <Button onClick={executeDelete} disabled={loading || (!!updaterId && !inputPin)} variant="destructive" className="flex-1 h-14 rounded-xl shadow-lg text-lg font-semibold">Xác nhận hủy</Button>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-6 pb-6 overflow-y-auto">
              <form id="edit-expense-form" onSubmit={handleSubmit} className="space-y-5 mt-2">
                <div className="space-y-2">
                  <Label className="text-slate-600">Tổng tiền</Label>
                  <Input 
                    type="text" required placeholder="Ví dụ: 250.000" value={totalAmount}
                    onChange={e => {
                      const rawValue = e.target.value.replace(/\D/g, '');
                      setTotalAmount(rawValue ? Number(rawValue).toLocaleString('vi-VN') : '');
                    }}
                    className="h-12 rounded-xl text-lg font-medium"
                    readOnly={viewOnly || splitMode === 'exact_amount'}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-600">Người trả</Label>
                  <Select value={payerId} onValueChange={handlePayerChange} required disabled={viewOnly}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Chọn người trả">{payerId ? members.find(m => m.id === payerId)?.name : "Chọn người trả"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-600">Ghi chú</Label>
                  <Input value={description} onChange={e => setDescription(e.target.value)} className="h-12 rounded-xl" readOnly={viewOnly} />
                </div>

                <div className="space-y-3">
                  <Label className="text-slate-600">Chế độ chia</Label>
                  <RadioGroup value={splitMode} onValueChange={(val: any) => {
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
                  }} className="grid grid-cols-2 gap-3" disabled={viewOnly}>
                    <Label htmlFor="edit-mode-equal" className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${splitMode === 'equal' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                      <RadioGroupItem value="equal" id="edit-mode-equal" className="border-slate-300 aria-checked:border-orange-600 aria-checked:bg-orange-600" />
                      <span className="text-sm font-medium">Chia đều</span>
                    </Label>
                    <Label htmlFor="edit-mode-portions" className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${splitMode === 'portions' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                      <RadioGroupItem value="portions" id="edit-mode-portions" className="border-slate-300 aria-checked:border-orange-600 aria-checked:bg-orange-600" />
                      <span className="text-sm font-medium">Số suất</span>
                    </Label>
                    <Label htmlFor="edit-mode-exact" className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${splitMode === 'exact_amount' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                      <RadioGroupItem value="exact_amount" id="edit-mode-exact" className="border-slate-300 aria-checked:border-orange-600 aria-checked:bg-orange-600" />
                      <span className="text-sm font-medium">Số tiền</span>
                    </Label>
                    <Label htmlFor="edit-mode-pay" className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${splitMode === 'pay_for_others' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                      <RadioGroupItem value="pay_for_others" id="edit-mode-pay" className="border-slate-300 aria-checked:border-orange-600 aria-checked:bg-orange-600" />
                      <span className="text-sm font-medium">Báo hộ</span>
                    </Label>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-slate-600">Tham gia ({participants.length})</Label>
                    {!viewOnly && <Button type="button" variant="ghost" size="sm" onClick={selectAll} className="text-orange-600">Chọn tất cả</Button>}
                  </div>
                  {!viewOnly && <Input placeholder="Tìm tên..." value={search} onChange={e => setSearch(e.target.value)} className="h-10 rounded-lg bg-slate-50" />}
                  <ScrollArea className={`${viewOnly ? 'max-h-[300px]' : 'h-[200px]'} border rounded-xl p-2 bg-slate-50`}>
                    <div className="space-y-1">
                    {(viewOnly ? filteredMembers.filter(m => participants.includes(m.id)) : filteredMembers).map(member => {
                      const isSelected = participants.includes(member.id);
                      const defaultPortions = splitMode === 'exact_amount' ? 0 : 1;
                      const advancedData = advancedSplits[member.id] || { portions: defaultPortions, sponsor_id: null };
                      return (
                      <div 
                        key={member.id} 
                        id={`edit-participant-container-${member.id}`}
                        className={`flex flex-col p-3 rounded-lg transition-colors ${isSelected ? 'bg-orange-50/50 border border-orange-100' : 'hover:bg-slate-100'} ${splitMode === 'pay_for_others' && member.id === payerId ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox 
                            id={`edit-participant-${member.id}`} 
                            checked={isSelected}
                            disabled={viewOnly || (splitMode === 'pay_for_others' && member.id === payerId)}
                            onCheckedChange={() => {
                              if (!isSelectClosing.current) toggleParticipant(member.id);
                            }}
                          />
                          <label 
                            htmlFor={`edit-participant-${member.id}`} 
                            onClick={(e) => {
                              if (isSelectClosing.current) e.preventDefault();
                            }}
                            className={`font-medium text-slate-700 select-none flex-1 ${viewOnly ? 'cursor-default' : 'cursor-pointer'}`}
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
                                  <button type="button" disabled={viewOnly} onClick={() => setAdvancedSplits(s => ({ ...s, [member.id]: { portions: Math.max(1, (s[member.id]?.portions || 1) - 1), sponsor_id: null } }))} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 disabled:opacity-50"><Minus className="w-3 h-3"/></button>
                                  <span className="text-sm font-medium w-6 text-center">{advancedData.portions}</span>
                                  <button type="button" disabled={viewOnly} onClick={() => setAdvancedSplits(s => ({ ...s, [member.id]: { portions: (s[member.id]?.portions || 1) + 1, sponsor_id: null } }))} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 disabled:opacity-50"><Plus className="w-3 h-3"/></button>
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
                                    className="h-9 w-32 bg-white"
                                    readOnly={viewOnly}
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
            
            <div className="p-4 bg-white border-t mt-auto shadow-[0_-10px_40px_rgba(0,0,0,0.05)] flex gap-3">
              {viewOnly ? (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 h-14 rounded-xl text-lg font-semibold bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700"
                >
                  Đóng
                </Button>
              ) : (
                <>
                  <Button 
                    type="button" 
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={loading} 
                    className="flex-none w-[120px] h-14 rounded-xl shadow-lg text-base font-semibold"
                  >
                    Hủy hóa đơn
                  </Button>
                  <Button 
                    type="submit" 
                    form="edit-expense-form"
                    disabled={loading || participants.length === 0 || !totalAmount || !payerId} 
                    className="flex-1 h-14 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg text-lg font-semibold"
                  >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Lưu thay đổi'}
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
