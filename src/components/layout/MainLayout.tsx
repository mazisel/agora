'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import BottomNavBar from './BottomNavBar';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar for desktop */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page Content */}
        <main className="flex-1 bg-slate-900 p-4 md:p-6 overflow-auto pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Bottom Nav Bar for mobile */}
      <BottomNavBar />
    </div>
  );
}
