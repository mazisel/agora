'use client';

import { useAuth } from '@/contexts/AuthContext';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-900 flex">
      {/* Ana Sidebar */}
      <Sidebar />
      
      {/* Mesajlar İçeriği */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
