'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginMember } from '@/app/actions/auth';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

export function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !pinCode) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (identifier.toLowerCase() === 'admin') {
        const { loginAdmin } = await import('@/app/actions/auth');
        await loginAdmin(pinCode);
      } else {
        await loginMember(identifier, pinCode, remember);
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-4 md:p-8 font-sans overflow-hidden relative">
      
      {/* Decorative background shapes */}
      <div className="absolute top-0 left-0 w-[40vw] h-[40vw] bg-blue-600 rounded-br-[100%] opacity-[0.03] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[50vw] h-[50vw] bg-orange-600 rounded-tl-[100%] opacity-[0.05] pointer-events-none" />
      
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
        
        {/* Left Side: Illustration & Marketing Copy (Hidden on Mobile) */}
        <div className="hidden lg:flex flex-col justify-center pr-8 xl:pr-16">
          <div className="mb-8">
            <h1 className="text-4xl xl:text-5xl font-extrabold text-[#1a2b4b] leading-tight mb-2">
              Quản lý tiền cơm
            </h1>
            <h2 className="text-4xl xl:text-5xl font-extrabold text-orange-600 leading-tight mb-6">
              Rõ ràng, công bằng, dễ dàng
            </h2>
            <p className="text-lg text-slate-600 font-medium">
              Ghi nhận bữa ăn, tự động tính toán chi phí <br/>
              và biết ngay ai nên trả bao nhiêu.
            </p>
          </div>

          <div className="relative w-full mb-10 flex items-center justify-center">
            <img src="/asset/banner.png" alt="Banner" className="w-full max-w-[500px] h-auto object-contain" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3 bg-white p-5 rounded-2xl shadow-sm">
              <img src="/asset/feature_icon_receipt_list.png" alt="Icon" className="w-10 h-10 object-contain shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">Ghi nhận nhanh</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Nhập bữa ăn chỉ mất vài giây</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white p-5 rounded-2xl shadow-sm">
              <img src="/asset/feature_icon_calculator.png" alt="Icon" className="w-10 h-10 object-contain shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">Tính toán tự động</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Tự động chia tiền chính xác, minh bạch</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white p-5 rounded-2xl shadow-sm">
              <img src="/asset/feature_icon_shield_check.png" alt="Icon" className="w-10 h-10 object-contain shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">Rõ ràng, tin cậy</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Lịch sử minh bạch, không lo nhầm lẫn</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white p-5 rounded-2xl shadow-sm">
              <img src="/asset/feature_icon_growth_chart.png" alt="Icon" className="w-10 h-10 object-contain shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">Tổng quan dễ hiểu</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Biết ngay ai nợ, ai trả, bao nhiêu hôm nay</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-[32px] shadow-[0_10px_40px_rgb(0,0,0,0.08)] px-8 py-12 sm:px-10 sm:py-14 border border-slate-100 min-h-[600px] flex flex-col justify-center">
            <div className="flex flex-col items-center mb-10">
              <img src="/asset/logo_receipt_bowl_wallet.png" alt="Logo" className="h-[140px] object-contain mb-6" />
              <h2 className="text-[32px] font-extrabold text-[#1a2b4b] mb-3 text-center tracking-tight">
                Báo <span className="text-orange-600">tiền cơm</span>
              </h2>
              <p className="text-slate-500 text-[15px] text-center">
                Theo dõi tiền cơm hôm nay: ai ăn, ai trả, hết bao nhiêu
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-sm font-medium border border-red-100 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-slate-800 font-bold text-sm">Email / Số điện thoại</Label>
                <div className="relative">
                  <Input 
                    placeholder="Nhập email hoặc số điện thoại"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    className="h-12 pl-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 transition-colors"
                    disabled={loading}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-800 font-bold text-sm">Mật khẩu</Label>
                <div className="relative">
                  <Input 
                    type={showPin ? "text" : "password"}
                    placeholder="Nhập mật khẩu"
                    value={pinCode}
                    onChange={e => setPinCode(e.target.value.replace(/\D/g, ''))}
                    maxLength={6}
                    className="h-12 pl-11 pr-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 tracking-widest font-mono transition-colors"
                    disabled={loading}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="remember" 
                    checked={remember}
                    onCheckedChange={(c) => setRemember(!!c)}
                    className="rounded border-slate-300 data-[state=checked]:bg-[#1e3a8a] data-[state=checked]:border-[#1e3a8a]"
                  />
                  <label htmlFor="remember" className="text-sm text-slate-600 font-medium cursor-pointer select-none">
                    Ghi nhớ đăng nhập
                  </label>
                </div>
                <button type="button" className="text-sm font-semibold text-blue-600 hover:underline">
                  Quên mật khẩu?
                </button>
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] hover:from-[#1a3278] hover:to-[#1d4ed8] text-white rounded-xl font-bold text-[15px] shadow-lg shadow-blue-500/20 transition-all mt-6 relative overflow-hidden group border-0"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Đăng nhập'}
                
                {/* Decorative arrow */}
                {!loading && (
                  <div className="absolute right-0 top-0 bottom-0 w-[72px] bg-[#f97316] flex items-center justify-center rounded-r-xl border-l-[6px] border-white group-hover:bg-[#ea580c] transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </div>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
