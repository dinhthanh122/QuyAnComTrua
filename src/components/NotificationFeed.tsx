'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { getRecentNotifications, NotificationType } from '@/app/actions/notification';
import { format } from 'date-fns';

export function NotificationFeed() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch notifications
    const fetchNotifs = async () => {
      const data = await getRecentNotifications();
      setNotifications(data);
      
      const lastReadStr = localStorage.getItem('last_read_notification');
      const lastRead = lastReadStr ? new Date(lastReadStr).getTime() : 0;
      
      const unread = data.filter(n => new Date(n.created_at).getTime() > lastRead).length;
      setUnreadCount(unread);
    };
    
    fetchNotifs();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Close dropdown on click outside
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = () => {
    setOpen(!open);
    if (!open && notifications.length > 0) {
      // Mark as read
      setUnreadCount(0);
      localStorage.setItem('last_read_notification', new Date().toISOString());
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={handleOpen}
        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-500 relative outline-none"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-[9px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-12 right-0 w-80 max-h-96 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Thông báo chung</h3>
            <span className="text-xs text-slate-400">Hoạt động gần đây</span>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">
                Chưa có thông báo nào.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map(n => (
                  <div key={n.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-semibold text-slate-800">{n.title}</span>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                        {format(new Date(n.created_at), 'dd/MM HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{n.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
