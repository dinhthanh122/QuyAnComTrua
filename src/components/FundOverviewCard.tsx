'use client';

import { Card, CardContent } from './ui/card';
import { Member } from '@/app/actions/expense';

export function FundOverviewCard({ members }: { members: Member[] }) {
  // 1. Get Top 5 positive and Top 5 negative
  const positiveMembers = members.filter(m => m.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 5);
  const negativeMembers = members.filter(m => m.balance < 0).sort((a, b) => a.balance - b.balance).slice(0, 5);

  // Combine and sort descending
  const chartData = [...positiveMembers, ...negativeMembers].sort((a, b) => b.balance - a.balance);

  if (chartData.length === 0) return null;

  // Find max absolute value to normalize bar heights
  const maxAbsBalance = Math.max(...chartData.map(d => Math.abs(d.balance)));

  // Format short name (e.g. "Nguyen Van A" -> "A")
  const getShortName = (name: string) => {
    const parts = name.split(' ');
    return parts[parts.length - 1];
  };

  const formatNumberShort = (num: number) => {
    // 150000 -> 150k
    if (Math.abs(num) >= 1000) {
      return (num / 1000) + 'k';
    }
    return num.toString();
  };

  return (
    <Card className="mb-6 rounded-3xl overflow-hidden border-none shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] bg-[#1e222d]">
      <CardContent className="p-4">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Top Biến Động</h2>
        
        <div className="flex h-40 items-center relative w-full pt-4 pb-4">
          {/* Zero Line */}
          <div className="absolute w-full h-[1px] bg-slate-600/50 top-1/2 left-0 z-0" />
          
          {/* Bars */}
          {chartData.map((d, i) => {
            // max height of a bar is 100% of half container (which means it touches top or bottom)
            const heightPercent = maxAbsBalance === 0 ? 0 : (Math.abs(d.balance) / maxAbsBalance) * 100;
            const isPositive = d.balance > 0;
            
            return (
              <div key={d.id} className="flex-1 flex flex-col justify-center items-center h-full relative z-10">
                
                {/* Upper Half (Positive) */}
                <div className="w-full h-1/2 flex items-end justify-center pb-[1px]">
                  {isPositive && (
                    <div 
                      className="w-3/4 max-w-[24px] bg-[#089981] rounded-t-sm relative transition-all duration-500 ease-out"
                      style={{ height: `${heightPercent}%`, minHeight: '2px' }}
                    >
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-[#089981]">
                        {formatNumberShort(d.balance)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Lower Half (Negative) */}
                <div className="w-full h-1/2 flex items-start justify-center pt-[1px]">
                  {!isPositive && (
                    <div 
                      className="w-3/4 max-w-[24px] bg-[#f23645] rounded-b-sm relative transition-all duration-500 ease-out"
                      style={{ height: `${heightPercent}%`, minHeight: '2px' }}
                    >
                      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-[#f23645]">
                        {formatNumberShort(d.balance)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Name Label */}
                <div className="absolute -bottom-6 text-[10px] text-slate-400 font-medium truncate w-[120%] text-center">
                  {getShortName(d.name)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
