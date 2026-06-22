'use client';

import { Card, CardContent } from './ui/card';
import { TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';

export function FundOverviewCard({ stats }: { stats: { totalFund: number, incomeThisMonth: number, expenseThisMonth: number } }) {
  return (
    <Card className="mb-6 rounded-3xl overflow-hidden border-none shadow-sm bg-white">
      <CardContent className="p-5">
        {/* Total Fund */}
        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <PiggyBank className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Tổng quỹ hiện tại</p>
            <p className="text-2xl font-extrabold text-slate-800">
              {stats.totalFund > 0 ? '+' : ''}{stats.totalFund.toLocaleString('vi-VN')} đ
            </p>
          </div>
        </div>

        {/* This month stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0">
               <TrendingUp className="w-5 h-5" />
             </div>
             <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Thu tháng này</p>
               <p className="text-sm font-bold text-slate-700">+{stats.incomeThisMonth.toLocaleString('vi-VN')} đ</p>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
               <TrendingDown className="w-5 h-5" />
             </div>
             <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Chi tháng này</p>
               <p className="text-sm font-bold text-slate-700">-{stats.expenseThisMonth.toLocaleString('vi-VN')} đ</p>
             </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
