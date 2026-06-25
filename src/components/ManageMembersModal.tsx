'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Member } from '@/app/actions/expense';
import { addMember, updateMember, deleteMember } from '@/app/actions/member';
import { Users, Plus, Pencil, Trash2, Loader2, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import boyAvatar from '@/asset/boy.png';
import girlAvatar from '@/asset/girl.png';

export function ManageMembersModal({ members }: { members: Member[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPinCode, setNewPinCode] = useState('');
  const [newReceiveNotifs, setNewReceiveNotifs] = useState(true);
  const [newGender, setNewGender] = useState('MALE');
  
  // For editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editReceiveNotifs, setEditReceiveNotifs] = useState(true);
  const [editPinCode, setEditPinCode] = useState('');
  const [editGender, setEditGender] = useState('MALE');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const totalPages = Math.ceil(members.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedMembers = members.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPinCode.trim()) {
      alert('Vui lòng nhập đầy đủ tên, email và Mã PIN');
      return;
    }
    setLoading(true);
    try {
      await addMember(newName.trim(), newEmail.trim(), newReceiveNotifs, newPinCode.trim() || undefined, newGender);
      setNewName('');
      setNewEmail('');
      setNewPinCode('');
      setNewReceiveNotifs(true);
      setNewGender('MALE');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (m: Member) => {
    setEditingId(m.id);
    setEditName(m.name);
    setEditEmail(m.email || '');
    setEditPinCode(m.pin_code || '');
    setEditReceiveNotifs(m.receive_notifications !== false);
    setEditGender(m.gender || 'MALE');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim() || !editEmail.trim() || !editPinCode.trim()) {
      alert('Vui lòng nhập đầy đủ tên, email và Mã PIN');
      return;
    }
    setLoading(true);
    try {
      await updateMember(id, editName.trim(), editEmail.trim(), editReceiveNotifs, editPinCode.trim() || undefined, editGender);
      setEditingId(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa "${name}"?`)) return;
    setLoading(true);
    try {
      await deleteMember(id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="w-full outline-none">
        <div className="w-full h-14 rounded-xl text-base border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center font-semibold transition-colors cursor-pointer">
          <Users className="w-5 h-5 mr-2" />
          Quản lý thành viên
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl p-6 max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Quản lý Thành viên</DialogTitle>
        </DialogHeader>

        {/* Add new */}
        <form onSubmit={handleAdd} className="flex flex-col gap-2 mt-4">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input 
                placeholder="Tên thành viên mới..." 
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="flex-1 rounded-xl"
                disabled={loading}
              />
              <select
                value={newGender}
                onChange={e => setNewGender(e.target.value)}
                className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
                disabled={loading}
              >
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Input 
                placeholder="Email (bắt buộc)..." 
                type="email"
                required
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                className="flex-1 rounded-xl"
                disabled={loading}
              />
              <Input 
                placeholder="Mã PIN (6 số)" 
                required
                value={newPinCode}
                onChange={e => setNewPinCode(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                className="w-32 rounded-xl text-center font-mono tracking-widest"
                disabled={loading}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm text-slate-600 flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={newReceiveNotifs}
                onChange={e => setNewReceiveNotifs(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              Nhận thông báo qua Email
            </label>
            <div className="flex-1" />
            <Button type="submit" disabled={loading || !newName.trim()} className="rounded-xl bg-slate-900">
              <Plus className="w-5 h-5 mr-1" /> Thêm
            </Button>
          </div>
        </form>

        {/* List */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1">
          {paginatedMembers.map(m => (
            <div key={m.id} className="flex items-center justify-between p-3 border rounded-xl bg-slate-50">
              {editingId === m.id ? (
                <div className="flex items-center flex-1 gap-2">
                  <div className="flex flex-col flex-1 gap-2 w-full">
                    <div className="flex gap-2">
                      <Input 
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="h-9 flex-1"
                        placeholder="Tên thành viên..."
                        autoFocus
                      />
                      <select
                        value={editGender}
                        onChange={e => setEditGender(e.target.value)}
                        className="h-9 w-24 rounded-md border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
                      >
                        <option value="MALE">Nam</option>
                        <option value="FEMALE">Nữ</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        value={editEmail}
                        onChange={e => setEditEmail(e.target.value)}
                        className="h-9 flex-1"
                        placeholder="Email (bắt buộc)..."
                        type="email"
                        required
                      />
                      <Input 
                        value={editPinCode}
                        onChange={e => setEditPinCode(e.target.value.replace(/\D/g, ''))}
                        className="h-9 w-24 text-center tracking-widest font-mono"
                        placeholder="Mã PIN"
                        maxLength={6}
                        required
                      />
                    </div>
                    <label className="text-sm text-slate-600 flex items-center gap-2 cursor-pointer mt-1">
                      <input 
                        type="checkbox" 
                        checked={editReceiveNotifs}
                        onChange={e => setEditReceiveNotifs(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 w-3 h-3"
                      />
                      Nhận email
                    </label>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(m.id)} disabled={loading} className="px-2 text-blue-600">
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} disabled={loading} className="px-2 text-slate-400">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 mr-3 flex items-center justify-center">
                    {m.gender === 'FEMALE' ? (
                      <img src={girlAvatar.src} alt="Nữ" className="w-full h-full object-cover" />
                    ) : (
                      <img src={boyAvatar.src} alt="Nam" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="font-medium text-slate-700 truncate">{m.name} {m.pin_code && <span className="text-xs font-normal text-slate-400 ml-1">(Có PIN)</span>}</div>
                    {m.email && <div className="text-xs text-slate-500 truncate">{m.email}</div>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(m)} disabled={loading} className="px-2 text-blue-600">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(m.id, m.name)} disabled={loading} className="px-2 text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
          {members.length === 0 && (
            <div className="text-center text-slate-500 py-4">Chưa có thành viên nào.</div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t mt-2">
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
      </DialogContent>
    </Dialog>
  );
}
