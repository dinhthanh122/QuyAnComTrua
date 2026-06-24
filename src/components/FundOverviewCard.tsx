'use client';

import { Card, CardContent } from './ui/card';
import { Member } from '@/app/actions/expense';

export function FundOverviewCard({ members }: { members: Member[] }) {
  // 1. Lấy danh sách dương, âm, và 0
  const positiveMembers = members.filter(m => m.balance > 0).sort((a, b) => b.balance - a.balance);
  const negativeMembers = members.filter(m => m.balance < 0).sort((a, b) => a.balance - b.balance);
  const zeroMembers = members.filter(m => m.balance === 0);

  let topPositive = positiveMembers.slice(0, 5);
  let topNegative = negativeMembers.slice(0, 5);

  // Điền thêm những người 0đ vào bên dương nếu thiếu
  if (topPositive.length < 5) {
    const needed = 5 - topPositive.length;
    topPositive = [...topPositive, ...zeroMembers.splice(0, needed)];
  }

  // Điền thêm những người 0đ vào bên âm nếu thiếu
  if (topNegative.length < 5) {
    const needed = 5 - topNegative.length;
    topNegative = [...topNegative, ...zeroMembers.splice(0, needed)];
  }

  // Combine and sort descending
  const chartData = [...topPositive, ...topNegative].sort((a, b) => b.balance - a.balance);

  if (chartData.length === 0) return null;

  // Find max absolute value to normalize bar heights
  const maxAbsBalance = Math.max(...chartData.map(d => Math.abs(d.balance)));

  // Format short name (e.g. "Lê Tuấn Anh" -> "AnhLT")
  const getShortName = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const last = parts.pop();
    const initials = parts.map(p => p[0].toUpperCase()).join('');
    return `${last}${initials}`;
  };

  const formatNumberShort = (num: number) => {
    if (num === 0) return '0';
    // 33333.33333 -> 33k
    if (Math.abs(num) >= 1000) {
      return Math.round(Math.abs(num) / 1000) + 'k';
    }
    return Math.round(Math.abs(num)).toString();
  };

  return (
    <Card className="mb-6 rounded-3xl overflow-hidden border-none shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] bg-[#1e222d]">
      <CardContent className="p-4 pt-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Top Biến Động</h2>
          <span className="text-xs text-slate-400 font-semibold bg-slate-800/50 px-2 py-1 rounded">Đơn vị: k = 1.000 VNĐ</span>
        </div>
        
        <div className="overflow-x-auto w-full pb-4">
          <div className="flex h-72 items-center relative w-full min-w-[600px] pt-6 pb-8 px-2">
          {/* Zero Line */}
          <div className="absolute w-full h-[1px] bg-slate-600/50 top-1/2 left-0 z-0" />
          
          {/* Bars */}
          {chartData.map((d, i) => {
            // max height of a bar is 100% of half container (which means it touches top or bottom)
            const heightPercent = maxAbsBalance === 0 ? 0 : (Math.abs(d.balance) / maxAbsBalance) * 100;
            
            return (
              <div key={d.id} className="flex-1 flex flex-col justify-center items-center h-full relative z-10">
                
                {/* Upper Half (Positive) */}
                <div className="w-full h-1/2 flex items-end justify-center pb-[1px]">
                  {d.balance > 0 && (
                    <div 
                      className="w-3/4 max-w-[24px] bg-[#089981] rounded-t-sm relative transition-all duration-500 ease-out"
                      style={{ height: `${heightPercent}%`, minHeight: '2px' }}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-[#089981]">
                        {formatNumberShort(d.balance)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Lower Half (Negative) */}
                <div className="w-full h-1/2 flex items-start justify-center pt-[1px]">
                  {d.balance < 0 && (
                    <div 
                      className="w-3/4 max-w-[24px] bg-[#f23645] rounded-b-sm relative transition-all duration-500 ease-out"
                      style={{ height: `${heightPercent}%`, minHeight: '2px' }}
                    >
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold text-[#f23645]">
                        {formatNumberShort(d.balance)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Middle (Zero) */}
                {d.balance === 0 && (
                  <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div className="w-5 h-[2px] bg-slate-500 rounded-full"></div>
                    <div className="absolute -top-6 text-xs font-bold text-slate-500">
                      0
                    </div>
                  </div>
                )}

                {/* Name Label */}
                <div className="absolute -bottom-8 text-[10px] text-slate-400 font-bold truncate w-[120%] text-center">
                  {getShortName(d.name)}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </CardContent>
    </Card>
  );
}
