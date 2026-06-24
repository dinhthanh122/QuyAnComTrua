'use client';

import { useState, useEffect } from 'react';
import { Member } from '@/app/actions/expense';
import { Input } from './ui/input';
import { Search, ChevronLeft, ChevronRight, ArrowRight, ArrowDownUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { MemberHistoryModal } from './MemberHistoryModal';
import boyAvatar from '@/asset/boy.png';
import girlAvatar from '@/asset/girl.png';

export function MembersList({ members }: { members: Member[] }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (selectedMember) {
      const updated = members.find(m => m.id === selectedMember.id);
      if (updated && (updated.balance !== selectedMember.balance || updated.meal_count !== selectedMember.meal_count)) {
        setSelectedMember(updated);
      }
    }
  }, [members, selectedMember]);

  let sortedMembers = [...members];
  if (sortBy === 'balance_asc') {
    sortedMembers.sort((a, b) => a.balance - b.balance);
  } else if (sortBy === 'balance_desc') {
    sortedMembers.sort((a, b) => b.balance - a.balance);
  } else if (sortBy === 'meals_asc') {
    sortedMembers.sort((a, b) => (a.meal_count || 0) - (b.meal_count || 0));
  } else if (sortBy === 'meals_desc') {
    sortedMembers.sort((a, b) => (b.meal_count || 0) - (a.meal_count || 0));
  } else {
    // default
    sortedMembers.sort((a, b) => a.name.localeCompare(b.name));
  }

  const filteredMembers = sortedMembers.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  // We want to pass the original rank/index to the card so the "Ranking" number is correct even when paginated.
  const paginatedMembersWithRank = filteredMembers.map((m, idx) => ({ ...m, rank: idx + 1 })).slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Define gradients array for cycling
  const gradients = [
    'from-[#6ea5ff] to-[#5a8bf1]', // Blue
    'from-[#ffbc5c] to-[#f49a37]'  // Orange
  ];

  // Reset to page 1 when searching
  const handleSearch = (v: string) => {
    setSearch(v);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Tìm kiếm thành viên..." 
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="pl-9 h-12 text-base rounded-xl shadow-sm"
          />
        </div>
        <div className="w-full sm:w-[220px] shrink-0">
          <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setCurrentPage(1); }}>
            <SelectTrigger className="h-12 rounded-xl shadow-sm bg-white border-slate-200">
              <div className="flex items-center gap-2">
                <ArrowDownUp className="w-4 h-4 text-slate-500" />
                <SelectValue placeholder="Sắp xếp theo" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Tên (A-Z)</SelectItem>
              <SelectItem value="balance_desc">Số dư: Cao nhất</SelectItem>
              <SelectItem value="balance_asc">Số dư: Thấp nhất</SelectItem>
              <SelectItem value="meals_desc">Số lần ăn: Nhiều nhất</SelectItem>
              <SelectItem value="meals_asc">Số lần ăn: Ít nhất</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3">
        {paginatedMembersWithRank.map((member, idx) => {
          const gradient = gradients[idx % gradients.length];
          return (
            <div 
              key={member.id} 
              className={`group relative overflow-hidden rounded-3xl bg-gradient-to-r ${gradient} shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer border-none text-white`}
              onClick={() => {
                setSelectedMember(member);
                setHistoryOpen(true);
              }}
            >
              {/* Decorative Curve on the right */}
              <div className="absolute top-0 right-0 h-full w-[35%] bg-white/10 rounded-l-[100px] pointer-events-none" />
              
              <div className="p-5 flex items-center justify-between relative z-10 gap-2">
                <div className="flex gap-3 items-center min-w-0 flex-1">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center overflow-hidden shrink-0 shadow-sm text-white">
                    {member.gender === 'FEMALE' ? (
                      <img src={girlAvatar.src} alt="Nữ" className="w-full h-full object-cover" />
                    ) : (
                      <img src={boyAvatar.src} alt="Nam" className="w-full h-full object-cover" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="font-extrabold text-xl leading-tight mb-1 tracking-wide drop-shadow-sm">{member.name}</div>
                    <div className="text-sm text-white/90 font-semibold mb-3 drop-shadow-sm truncate">
                      {member.email || 'Chưa cập nhật email'}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-extrabold text-lg leading-none mb-1 drop-shadow-sm whitespace-nowrap">
                          {member.balance > 0 ? '+' : ''}{Math.round(member.balance).toLocaleString('vi-VN')} VNĐ
                        </span>
                        <span className="text-[11px] text-white/90 uppercase tracking-wider font-bold">Số dư</span>
                      </div>
                      <div className="flex flex-col shrink-0 min-w-[50px] items-center">
                        <span className="font-extrabold text-lg leading-none mb-1 text-center drop-shadow-sm">
                          {member.meal_count || 0}
                        </span>
                        <span className="text-[10px] text-white/90 uppercase tracking-wider font-bold">Ăn tháng này</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* View Details */}
                <div className="flex flex-col items-center justify-center shrink-0 w-16 opacity-90 group-hover:opacity-100 transition-opacity">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mb-2">
                    <ArrowRight className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[10px] text-white font-medium uppercase tracking-wider text-center">Chi tiết</span>
                </div>
              </div>
            </div>
          );
        })}
        {filteredMembers.length === 0 && (
          <div className="text-center text-slate-500 py-8">
            Không tìm thấy thành viên nào.
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 pb-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="rounded-xl"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Trước
          </Button>
          <span className="text-sm font-medium text-slate-500">
            Trang {currentPage} / {totalPages}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="rounded-xl"
          >
            Sau
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      <MemberHistoryModal 
        member={selectedMember}
        members={members}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </div>
  );
}
