import { getTransactionHistory } from '@/app/actions/fund';
import { getMembers } from '@/app/actions/expense';
import { HistoryFilterView } from '@/components/HistoryFilterView';
import { checkIsAdmin } from '@/app/actions/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminHistoryPage() {
  const isAdmin = await checkIsAdmin();
  
  if (!isAdmin) {
    redirect('/');
  }

  let history: any[] = [];
  let members: any[] = [];
  try {
    history = await getTransactionHistory();
    members = await getMembers();
    console.log("HISTORY LENGTH FETCHED:", history.length);
  } catch (error) {
    console.error("Failed to load history or members", error);
  }

  return (
    <>
      <div style={{display: 'none'}} id="debug-history-length">{history.length}</div>
      <HistoryFilterView initialHistory={history} members={members} />
    </>
  );
}
