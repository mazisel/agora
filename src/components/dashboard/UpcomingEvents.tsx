'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  attendees: number;
  type: 'meeting' | 'deadline' | 'event' | 'reminder';
  priority: 'low' | 'medium' | 'high';
  color: string;
  created_at?: string;
  created_by?: string;
}

export default function UpcomingEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch events from Supabase (only events user participates in)
  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setEvents([]);
        return;
      }

      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          event_participants!inner (
            user_id
          )
        `)
        .eq('event_participants.user_id', user.id)
        .gte('date', '2025-08-12') // Show events from today onwards
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .limit(10);

      if (error) throw error;

      // Add color based on type
      const eventsWithColors = (data || []).map(event => ({
        ...event,
        color: getColorByType(event.type)
      }));

      setEvents(eventsWithColors);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get color gradient based on event type
  const getColorByType = (type: Event['type']) => {
    switch (type) {
      case 'meeting':
        return 'from-blue-400 to-blue-600';
      case 'deadline':
        return 'from-red-400 to-red-600';
      case 'event':
        return 'from-green-400 to-green-600';
      case 'reminder':
        return 'from-gray-400 to-gray-600';
      default:
        return 'from-purple-400 to-purple-600';
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const getTypeIcon = (type: Event['type']) => {
    switch (type) {
      case 'meeting':
        return <Users className="w-3 h-3" />;
      case 'deadline':
        return <Clock className="w-3 h-3" />;
      case 'event':
        return <Calendar className="w-3 h-3" />;
      case 'reminder':
        return <Clock className="w-3 h-3" />;
      default:
        return <Calendar className="w-3 h-3" />;
    }
  };

  const getPriorityColor = (priority: Event['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-400';
      case 'medium':
        return 'bg-yellow-400';
      case 'low':
        return 'bg-green-400';
      default:
        return 'bg-slate-400';
    }
  };

  const formatDate = (dateString: string) => {
    // Sabit tarih karşılaştırması kullanıyoruz (bugün 12.08.2025 olarak kabul ediyoruz)
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    
    // Bugün ve yarın kontrolü için sabit değerler
    if (dateString === '2025-08-12') {
      return 'Bugün';
    } else if (dateString === '2025-08-13') {
      return 'Yarın';
    } else if (dateString === '2025-08-14') {
      return '2 gün sonra';
    } else if (dateString === '2025-08-15') {
      return '3 gün sonra';
    } else if (dateString === '2025-08-16') {
      return '4 gün sonra';
    } else {
      return `${day}.${month.toString().padStart(2, '0')}`;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-4 overflow-hidden">
      {/* Header */}
      <div className="mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Yaklaşan Etkinlikler</h3>
          <p className="text-xs text-slate-400 mt-1">{events.length} etkinlik</p>
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600/30 scrollbar-track-transparent hover:scrollbar-thumb-slate-500/50 pr-1">
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="group p-3 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300"
              >
                {/* Event Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg bg-gradient-to-r ${event.color} text-white`}>
                      {getTypeIcon(event.type)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-xs group-hover:text-purple-300 transition-colors">
                        {event.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">{formatDate(event.date)}</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${getPriorityColor(event.priority)}`}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event Details */}
                <p className="text-xs text-slate-300 leading-relaxed mb-2 line-clamp-1">
                  {event.description}
                </p>

                {/* Event Meta */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-400">{event.time}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-400 truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-400">{event.attendees}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Loading State - Skeleton */}
            {isLoading && (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="group p-3 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50"
                >
                  <div className="animate-pulse">
                    {/* Event Header Skeleton */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-700 rounded-lg"></div>
                        <div>
                          <div className="h-3 bg-slate-700 rounded w-24 mb-1"></div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 bg-slate-700/70 rounded w-12"></div>
                            <div className="w-1.5 h-1.5 bg-slate-700 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Event Description Skeleton */}
                    <div className="h-2 bg-slate-700/70 rounded w-full mb-2"></div>

                    {/* Event Meta Skeleton */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-slate-700 rounded"></div>
                        <div className="h-2 bg-slate-700/70 rounded w-8"></div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-slate-700 rounded"></div>
                        <div className="h-2 bg-slate-700/70 rounded w-12"></div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-slate-700 rounded"></div>
                        <div className="h-2 bg-slate-700/70 rounded w-4"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Empty State */}
            {!isLoading && events.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-6 h-6 text-slate-600" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-2">Henüz Etkinlik Yok</h4>
                <p className="text-xs text-slate-400">Katıldığınız etkinlikler burada görünecek</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
