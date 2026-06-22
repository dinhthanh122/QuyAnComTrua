'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { loginAdmin } from '@/app/actions/auth';
import { Lock, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function LoginModal() {
  const [open, setOpen] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await loginAdmin(passcode);
      setOpen(false);
      setPasscode('');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Mã PIN không đúng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="outline-none">
        <div className="flex items-center text-sm text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
          <Lock className="w-4 h-4 mr-1" />
          Khu vực Quản lý
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm w-[90vw] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl text-center">Đăng nhập Quản lý</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleLogin} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Input 
              type="password" 
              placeholder="Nhập mã PIN..." 
              value={passcode}
              onChange={e => setPasscode(e.target.value)}
              className="h-12 rounded-xl text-center text-lg tracking-widest"
              autoFocus
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Xác nhận'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
