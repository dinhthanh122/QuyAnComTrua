import { getMembers, Member } from './actions/expense';
import { getFundStats } from './actions/fund';
import { MembersList } from '@/components/MembersList';
import { FundOverviewCard } from '@/components/FundOverviewCard';
import { FoodieChart } from '@/components/FoodieChart';
import { AddExpenseModal } from '@/components/AddExpenseModal';
import { SettleDebtModal } from '@/components/SettleDebtModal';
import { ManageMembersModal } from '@/components/ManageMembersModal';
import { SystemSettingsModal } from '@/components/SystemSettingsModal';
import { EmailConfigModal } from '@/components/EmailConfigModal';
import { ResetDatabaseModal } from '@/components/ResetDatabaseModal';
import { LoginModal } from '@/components/LoginModal';
import { checkIsAdmin, logoutAdmin } from './actions/auth';
import { AdminSessionTimeout } from '@/components/AdminSessionTimeout';
import { UtensilsCrossed, History } from 'lucide-react';
import Link from 'next/link';
import { NotificationFeed } from '@/components/NotificationFeed';
import { RealtimeSubscriber } from '@/components/RealtimeSubscriber';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let members: Member[] = [];
  try {
    members = await getMembers();
  } catch (error) {
    console.error("Failed to load members, maybe DB is not setup yet", error);
  }

  let stats = { totalFund: 0, incomeThisMonth: 0, expenseThisMonth: 0 };
  try {
    stats = await getFundStats();
  } catch(e) { 
    console.error("Failed to load fund stats", e); 
  }

  const isAdmin = await checkIsAdmin();

  return (
    <main className="min-h-screen bg-slate-50 pb-20 font-sans selection:bg-blue-100">
      <RealtimeSubscriber />
      <div className="bg-white px-5 pt-12 pb-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] rounded-b-3xl relative z-50">
        <div className="flex justify-between items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <UtensilsCrossed className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 ml-4">
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Quỹ Ăn Trưa</h1>
            <p className="text-sm text-slate-500 font-medium mt-0.5">Chia tiền nhanh chóng, sòng phẳng</p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <>
                <AdminSessionTimeout />
                <form action={logoutAdmin}>
                  <button type="submit" className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-colors font-medium">
                    Đăng xuất
                  </button>
                </form>
              </>
            ) : (
              <LoginModal />
            )}
            <NotificationFeed />
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          <AddExpenseModal members={members} />
          {isAdmin && (
            <>
              <SettleDebtModal members={members} />
              <div className="grid grid-cols-2 gap-3">
                <Link href="/admin/history" className="col-span-2 w-full h-14 rounded-xl text-base border border-slate-200 text-slate-700 bg-white hover:bg-slate-100 shadow-sm flex items-center justify-center font-semibold transition-colors">
                  <History className="w-5 h-5 mr-2" />
                  Lịch sử Giao dịch
                </Link>
                <ManageMembersModal members={members} />
                <SystemSettingsModal />
                <EmailConfigModal />
                <div className="col-span-2">
                  <ResetDatabaseModal />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="p-5 mt-2 w-full max-w-5xl mx-auto">
        <FundOverviewCard members={members} />
      </div>

      <div className="px-5 max-w-md mx-auto">
        <FoodieChart members={members} />
        
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">
          Số dư tài khoản
        </h2>
        {members.length > 0 ? (
          <MembersList members={members} />
        ) : (
          <div className="text-center p-8 bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-500">Chưa có dữ liệu thành viên.</p>
            <p className="text-xs text-slate-400 mt-2">Vui lòng kiểm tra lại kết nối Supabase.</p>
          </div>
        )}
      </div>
    </main>
  );
}
