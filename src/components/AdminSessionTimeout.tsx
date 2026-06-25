'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function AdminSessionTimeout() {
  const router = useRouter();

  useEffect(() => {
    // Refresh page after 15 minutes to reflect expired session
    const timer = setTimeout(() => {
      router.refresh();
    }, 15 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
