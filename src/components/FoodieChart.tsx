'use client';

import { Card, CardContent } from './ui/card';
import { Member } from '@/app/actions/expense';
import { Utensils, Trophy } from 'lucide-react';

export function FoodieChart({ members }: { members: Member[] }) {
  // Get top 5 members by meal_count, even if 0
  const topEaters = [...members]
    .sort((a, b) => (b.meal_count || 0) - (a.meal_count || 0))
    .slice(0, 5);

  if (topEaters.length === 0) return null;

  const maxMeals = Math.max(...topEaters.map(m => m.meal_count || 0));

  return (
    <Card className="mb-6 rounded-3xl overflow-hidden border-none shadow-sm bg-white">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-6">
           <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
             <Trophy className="w-6 h-6" />
           </div>
           <div>
             <h2 className="text-base font-extrabold text-slate-800 tracking-tight">Thực Thần Tháng Này</h2>
             <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-0.5">Top báo cơm nhiều nhất</p>
           </div>
        </div>

        <div className="flex flex-col gap-5">
          {topEaters.map((m, index) => {
            const count = m.meal_count || 0;
            const percent = maxMeals > 0 ? (count / maxMeals) * 100 : 0;
            
            return (
              <div key={m.id} className="w-full group">
                <div className="flex justify-between text-sm font-bold mb-2 px-1">
                  <span className="text-slate-600 flex items-center gap-2">
                    {index === 0 && <span className="text-2xl">🥇</span>}
                    {index === 1 && <span className="text-2xl">🥈</span>}
                    {index === 2 && <span className="text-2xl">🥉</span>}
                    {index > 2 && <span className="w-6 text-center text-slate-400 font-bold">#{index + 1}</span>}
                    {m.name}
                  </span>
                  <span className="text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md">{count} bữa</span>
                </div>
                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${index === 0 ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-gradient-to-r from-orange-300 to-orange-400'}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  );
}
