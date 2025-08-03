'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Briefcase, CheckSquare, User } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Ana Sayfa', icon: LayoutGrid },
  { href: '/projects', label: 'Projeler', icon: Briefcase },
  { href: '/tasks', label: 'Görevler', icon: CheckSquare },
];

export default function BottomNavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-800/90 backdrop-blur-sm border-t border-slate-700 md:hidden z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center text-xs gap-1 p-2">
              <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              <span className={`transition-colors ${isActive ? 'text-blue-400' : 'text-slate-300'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
