'use client';

import { useState, useMemo } from 'react';
import { TransactionHistory } from '@/app/actions/fund';
import { History, ArrowDownToLine, ArrowUpFromLine, UtensilsCrossed, Search, ArrowLeft, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import { Button } from './ui/button';
import { NotificationFeed } from './NotificationFeed';
import { EditExpenseModal } from './EditExpenseModal';
import { Member } from '@/app/actions/expense';
import { useRouter } from 'next/navigation';

export function HistoryFilterView({ 
  initialHistory, 
  members, 
  defaultTypeFilter = 'ALL',
  hideTypeFilter = false,
  title = 'Lịch sử Thu Chi',
  icon = <History className="w-6 h-6 text-blue-600" />
}: { 
  initialHistory: TransactionHistory[], 
  members: Member[],
  defaultTypeFilter?: 'ALL' | 'EXPENSE' | 'NAP_QUY' | 'RUT_QUY' | 'FUND',
  hideTypeFilter?: boolean,
  title?: string,
  icon?: React.ReactNode
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [editingExpense, setEditingExpense] = useState<TransactionHistory | null>(null);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'EXPENSE' | 'NAP_QUY' | 'RUT_QUY' | 'FUND'>(defaultTypeFilter);
  const [dateFilterType, setDateFilterType] = useState('ALL'); // 'ALL', 'CUSTOM'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;



  const filteredHistory = useMemo(() => {
    return initialHistory.filter(tx => {
      // 1. Filter by Search
      if (search) {
        const query = search.toLowerCase();
        if (!tx.actor_name.toLowerCase().includes(query) && 
            !(tx.description && tx.description.toLowerCase().includes(query))) {
          return false;
        }
      }
      if (typeFilter !== 'ALL') {
        if (typeFilter === 'FUND' && tx.type === 'EXPENSE') return false;
        if (typeFilter !== 'FUND' && tx.type !== typeFilter) return false;
      }
      // 3. Filter by Date
      if (dateFilterType === 'THIS_MONTH') {
        const now = new Date();
        const txDate = new Date(tx.created_at);
        if (txDate.getMonth() !== now.getMonth() || txDate.getFullYear() !== now.getFullYear()) return false;
      } else if (dateFilterType === 'LAST_MONTH') {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const txDate = new Date(tx.created_at);
        if (txDate.getMonth() !== lastMonth.getMonth() || txDate.getFullYear() !== lastMonth.getFullYear()) return false;
      } else if (dateFilterType === 'CUSTOM') {
        const txTime = new Date(tx.created_at).getTime();
        if (startDate) {
          const start = new Date(startDate).getTime();
          if (txTime < start) return false;
        }
        if (endDate) {
          // Add 23:59:59 to endDate to include the entire day
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (txTime > end.getTime()) return false;
        }
      }
      return true;
    });
  }, [initialHistory, search, typeFilter, dateFilterType, startDate, endDate]);

  const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedHistory = filteredHistory.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSearch = (v: string) => {
    setSearch(v);
    setCurrentPage(1);
  };
  const handleTypeChange = (v: any) => {
    setTypeFilter(v);
    setCurrentPage(1);
  };
  const handleDateFilterTypeChange = (v: string) => {
    setDateFilterType(v);
    if (v !== 'CUSTOM') {
      setStartDate('');
      setEndDate('');
    }
    setCurrentPage(1);
  };

  const exportToExcel = () => {
    const data = filteredHistory.map(tx => ({
      'Thời gian': format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm'),
      'Loại': tx.type === 'EXPENSE' ? 'Báo Cơm' : tx.type === 'NAP_QUY' ? 'Nạp Quỹ' : 'Rút Quỹ',
      'Người thao tác': tx.actor_name,
      'Người liên quan': tx.participants ? tx.participants.join(', ') : '',
      'Số tiền': tx.type === 'RUT_QUY' || tx.type === 'EXPENSE' ? -Math.round(tx.amount) : Math.round(tx.amount),
      'Ghi chú': tx.description
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    
    // Auto-size columns
    const wscols = [
      {wch: 18}, // Thời gian
      {wch: 12}, // Loại
      {wch: 25}, // Người thao tác
      {wch: 40}, // Người liên quan
      {wch: 15}, // Số tiền
      {wch: 30}  // Ghi chú
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LichSu");
    XLSX.writeFile(wb, `LichSu_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
  };

  const getIcon = (type: TransactionHistory['type']) => {
    switch (type) {
      case 'NAP_QUY': return <ArrowDownToLine className="w-4 h-4 text-green-600" />;
      case 'RUT_QUY': return <ArrowUpFromLine className="w-4 h-4 text-orange-600" />;
      case 'EXPENSE': return <UtensilsCrossed className="w-4 h-4 text-blue-600" />;
    }
  };

  const getTypeLabel = (type: TransactionHistory['type']) => {
    switch (type) {
      case 'NAP_QUY': return <span className="text-green-700 font-medium">Nạp Quỹ</span>;
      case 'RUT_QUY': return <span className="text-orange-700 font-medium">Rút Quỹ</span>;
      case 'EXPENSE': return <span className="text-blue-700 font-medium">Báo Cơm</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-500">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {icon}
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={exportToExcel} className="hidden sm:flex items-center gap-2 border-slate-200">
              <Download className="w-4 h-4" />
              Xuất Excel
            </Button>
            <NotificationFeed />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-6">
        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Tìm tên hoặc ghi chú..."
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
              value={search}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>

          {!hideTypeFilter && (
            <select
              className="block w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-xl leading-5 bg-slate-50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
              value={typeFilter}
              onChange={e => handleTypeChange(e.target.value)}
            >
              <option value="ALL">Tất cả giao dịch</option>
              <option value="EXPENSE">Chỉ Báo Cơm</option>
              <option value="FUND">Chỉ Nạp/Rút Quỹ</option>
              <option value="NAP_QUY">Chỉ Nạp Quỹ</option>
              <option value="RUT_QUY">Chỉ Rút Quỹ</option>
            </select>
          )}

          <select
            className="block w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-xl leading-5 bg-slate-50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            value={dateFilterType}
            onChange={e => handleDateFilterTypeChange(e.target.value)}
          >
            <option value="ALL">Tất cả thời gian</option>
            <option value="THIS_MONTH">Tháng này</option>
            <option value="LAST_MONTH">Tháng trước</option>
            <option value="CUSTOM">Tùy chọn khoảng thời gian...</option>
          </select>
        </div>

        <div className="sm:hidden mb-6 flex justify-end">
           <Button variant="outline" onClick={exportToExcel} className="w-full flex items-center justify-center gap-2 border-slate-200">
              <Download className="w-4 h-4" />
              Xuất Excel
            </Button>
        </div>

        {/* Custom Date Range Picker */}
        {dateFilterType === 'CUSTOM' && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">Từ ngày:</span>
              <input 
                type="date" 
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">Đến ngày:</span>
              <input 
                type="date" 
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); setCurrentPage(1); }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium ml-auto"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <History className="w-12 h-12 mb-4 text-slate-300" />
              <p>Không tìm thấy giao dịch nào phù hợp.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-4 font-semibold whitespace-nowrap">Thời gian</th>
                    <th className="px-5 py-4 font-semibold whitespace-nowrap">Loại</th>
                    <th className="px-5 py-4 font-semibold whitespace-nowrap">Người thao tác</th>
                    <th className="px-5 py-4 font-semibold">Người liên quan</th>
                    <th className="px-5 py-4 font-semibold whitespace-nowrap text-right">Số tiền</th>
                    <th className="px-5 py-4 font-semibold">Ghi chú</th>
                    <th className="px-5 py-4 font-semibold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedHistory.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap text-slate-500">
                        {format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap flex items-center gap-2">
                        {getIcon(tx.type)}
                        {getTypeLabel(tx.type)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap font-medium text-slate-800">
                        {tx.actor_name}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {tx.participants && tx.participants.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {tx.participants.map(p => (
                              <span key={p} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-xs border border-slate-200">
                                {p}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap font-bold text-right text-slate-700">
                        {tx.type === 'RUT_QUY' ? '-' : (tx.type === 'EXPENSE' ? '-' : '+')}
                        {Math.round(tx.amount).toLocaleString('vi-VN')} VNĐ
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {tx.description}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {tx.type === 'EXPENSE' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setEditingExpense(tx)} 
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
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-6 pb-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="rounded-xl h-10 px-4"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Trang trước
            </Button>
            <span className="text-sm font-medium text-slate-500">
              Trang {currentPage} / {totalPages}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="rounded-xl h-10 px-4"
            >
              Trang sau
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      <EditExpenseModal 
        expense={editingExpense} 
        members={members} 
        open={!!editingExpense} 
        onOpenChange={(o) => { if (!o) setEditingExpense(null); }} 
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
