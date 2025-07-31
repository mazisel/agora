'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import WeeklyActivities from '@/components/dashboard/WeeklyActivities';
import NotesSection from '@/components/dashboard/NotesSection';
import UpcomingEvents from '@/components/dashboard/UpcomingEvents';
import TaskCards from '@/components/dashboard/TaskCards';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  const [selectedStatus, setSelectedStatus] = useState<string>('incelemede');
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [greeting, setGreeting] = useState('');

  // Set greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Günaydın');
    } else if (hour < 18) {
      setGreeting('Tünaydın');
    } else {
      setGreeting('İyi akşamlar');
    }
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Show loading while checking authentication
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
  };

  return (
    <MainLayout>
      {/* Mobile View */}
      <div className="lg:hidden space-y-6">
        <div className="px-4">
          <h1 className="text-2xl font-bold text-white">{greeting}, {userProfile?.first_name}</h1>
          <p className="text-slate-400">İşte günün özeti</p>
        </div>

        <Link href="/tasks" className="block mx-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex justify-between items-center">
          <div>
            <p className="font-semibold text-blue-300">Görevler</p>
            <p className="text-sm text-slate-300">3 göreviniz incelemede</p>
          </div>
          <ArrowRight className="w-5 h-5 text-blue-400" />
        </Link>

        <div className="space-y-6">
          <WeeklyActivities />
          <div className="px-4">
            <UpcomingEvents />
          </div>
          <div className="px-4">
            <NotesSection />
          </div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
        {/* Left Section - Activities, Projects and Notes */}
        <div className="flex-1 flex flex-col space-y-6 min-h-0">
          {/* Weekly Activities */}
          <div className="flex-shrink-0">
            <WeeklyActivities />
          </div>
          
          {/* Bottom Section - Notes and Events */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
            {/* Notes Section */}
            <div className="min-h-0 h-full">
              <NotesSection />
            </div>
            
            {/* Upcoming Events */}
            <div className="min-h-0 h-full">
              <UpcomingEvents />
            </div>
          </div>
        </div>

        {/* Right Section - Task Panel */}
        <div className="w-full lg:w-96 flex-shrink-0 h-full">
          <div className="h-full bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-4">
            <TaskCards 
              selectedStatus={selectedStatus} 
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
