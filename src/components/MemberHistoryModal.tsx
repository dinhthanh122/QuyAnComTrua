'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Member, getExpenseDetails } from '@/app/actions/expense';
import { MemberTransaction, verifyPinAndGetHistory, checkNeedsPin } from '@/app/actions/history';
import { Loader2, Lock, ArrowUpRight, ArrowDownRight, Wallet, History, UtensilsCrossed, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { EditExpenseModal } from './EditExpenseModal';

export function MemberHistoryModal({
  member,
  members,
  open,
  onOpenChange
}: {
  member: Member | null;
  members: Member[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [needsPin, setNeedsPin] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [history, setHistory] = useState<MemberTransaction[] | null>(null);
  const [error, setError] = useState('');
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (open && member) {
      setLoading(true);
      setHistory(null);
      setPinCode('');
      setError('');
      
      checkNeedsPin(member.id).then(needs => {
        setNeedsPin(needs);
        if (!needs) {
          fetchHistory(null);
        } else {
          setLoading(false);
        }
      });
    }
  }, [open, member]);

  const fetchHistory = async (pin: string | null) => {
    setLoading(true);
    setError('');
    try {
      const data = await verifyPinAndGetHistory(member!.id, pin);
      setHistory(data);
      setCurrentPage(1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinCode) return;
    fetchHistory(pinCode);
  };

  const handleEditClick = async (txId: string) => {
    setLoading(true);
    try {
      const realId = txId.replace('_split', '');
      const details = await getExpenseDetails(realId);
      if (details) {
        setEditingExpense(details);
      } else {
        alert('Không tìm thấy hóa đơn này.');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl p-6 max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex flex-col gap-1">
            <span className="text-slate-500 text-sm font-normal">Lịch sử giao dịch</span>
            <span className="text-blue-900">{member.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4 pr-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              Đang tải dữ liệu...
            </div>
          ) : needsPin && !history ? (
            <form onSubmit={handlePinSubmit} className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Yêu cầu bảo mật</h3>
              <p className="text-sm text-slate-500 text-center mb-6">
                Lịch sử của thành viên này được bảo vệ bằng mã PIN. Vui lòng nhập mã để xem.
              </p>
              <Input 
                type="password"
                placeholder="Nhập mã PIN..."
                value={pinCode}
                onChange={e => setPinCode(e.target.value.replace(/\D/g, ''))}
                className="w-full max-w-[200px] text-center tracking-[0.5em] text-lg rounded-xl mb-4"
                maxLength={6}
                autoFocus
              />
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              <Button type="submit" disabled={!pinCode} className="w-full max-w-[200px] rounded-xl bg-blue-600 hover:bg-blue-700">
                Xác nhận
              </Button>
            </form>
          ) : history ? (
            <div className="flex flex-col gap-3">
              <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between mb-2">
                <span className="text-slate-600 font-medium">Số dư hiện tại</span>
                <span className={`font-bold text-lg ${member.balance > 0 ? 'text-blue-600' : member.balance < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                  {member.balance > 0 ? '+' : ''}{member.balance.toLocaleString()} đ
                </span>
              </div>
              
              {history.length === 0 ? (
                <div className="text-center py-8 text-slate-500">Chưa có giao dịch nào.</div>
              ) : (
                <div className="border rounded-xl overflow-hidden bg-white mt-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b">
                        <tr>
                          <th className="px-4 py-3 font-medium">Thời gian</th>
                          <th className="px-4 py-3 font-medium">Nội dung</th>
                          <th className="px-4 py-3 font-medium text-right">Biến động</th>
                          <th className="px-2 py-3 font-medium text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {history.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                              {new Date(tx.date).toLocaleString('vi-VN')}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {tx.type === 'PAID' && <Wallet className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                                {tx.type === 'PARTICIPATED' && <UtensilsCrossed className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                                {(tx.type === 'NAP_QUY' || tx.type === 'RUT_QUY') && <History className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                                <span className="font-medium text-slate-700">{tx.description}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <span className={`font-semibold ${tx.balance_change > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                {tx.balance_change > 0 ? '+' : ''}{tx.balance_change.toLocaleString()}đ
                              </span>
                            </td>
                            <td className="px-2 py-3 text-right">
                              {(tx.type === 'PAID' || tx.type === 'PARTICIPATED') && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleEditClick(tx.id)} 
                                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 h-8"
                                >
                                  Sửa
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {Math.ceil(history.length / ITEMS_PER_PAGE) > 1 && (
                    <div className="flex items-center justify-between p-3 border-t bg-slate-50/30">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="rounded-lg h-8 px-3 text-xs"
                      >
                        <ChevronLeft className="w-3 h-3 mr-1" />
                        Trước
                      </Button>
                      <span className="text-xs font-medium text-slate-500">
                        Trang {currentPage} / {Math.ceil(history.length / ITEMS_PER_PAGE)}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(history.length / ITEMS_PER_PAGE)))}
                        disabled={currentPage === Math.ceil(history.length / ITEMS_PER_PAGE)}
                        className="rounded-lg h-8 px-3 text-xs"
                      >
                        Sau
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
      <EditExpenseModal
        expense={editingExpense}
        members={members}
        open={!!editingExpense}
        onOpenChange={(o) => { if (!o) setEditingExpense(null); }}
        updaterId={member.id}
        pinCode={pinCode}
        onSuccess={() => fetchHistory(pinCode)}
      />
    </Dialog>
  );
}
