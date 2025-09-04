'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import {
  ChatState,
  Channel,
  Message,
  SendMessageData,
  EditMessageData,
  ReactionData,
  ChannelCreateData,
  JoinChannelData,
  LeaveChannelData,
  MarkAsReadData,
  UserPresence,
  TypingIndicator,
  MessageSearchResult
} from '@/types/messaging';

type MessagingAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CHANNELS'; payload: Channel[] }
  | { type: 'ADD_CHANNEL'; payload: Channel }
  | { type: 'UPDATE_CHANNEL'; payload: Channel }
  | { type: 'REMOVE_CHANNEL'; payload: string }
  | { type: 'SET_ACTIVE_CHANNEL'; payload: string }
  | { type: 'SET_MESSAGES'; payload: { channelId: string; messages: Message[] } }
  | { type: 'PREPEND_MESSAGES'; payload: { channelId: string; messages: Message[] } }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: Message }
  | { type: 'REMOVE_MESSAGE'; payload: string }
  | { type: 'SET_TYPING_USERS'; payload: { channelId: string; users: TypingIndicator[] } }
  | { type: 'SET_USER_PRESENCE'; payload: { userId: string; presence: UserPresence } }
  | { type: 'SET_UNREAD_COUNT'; payload: { channelId: string; count: number } }
  | { type: 'SET_SEARCH_RESULTS'; payload: MessageSearchResult[] }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_MESSAGES_LOADING'; payload: { channelId: string; loading: boolean } }
  | { type: 'SET_HAS_MORE_MESSAGES'; payload: { channelId: string; hasMore: boolean } }
  | { type: 'CLEAR_SEARCH' };

const initialState: ChatState = {
  channels: [],
  activeChannelId: undefined,
  messages: {},
  typingUsers: {},
  userPresence: {},
  unreadCounts: {},
  isLoading: false,
  searchResults: [],
  searchQuery: '',
  messagesLoading: {},
  hasMoreMessages: {}
};

function messagingReducer(state: ChatState, action: MessagingAction): ChatState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_CHANNELS':
      return { ...state, channels: action.payload };

    case 'ADD_CHANNEL':
      // Duplicate kanal kontrolü
      const channelExists = state.channels.some(ch => ch.id === action.payload.id);
      if (channelExists) {
        return state; // Kanal zaten var, state'i değiştirme
      }
      return { 
        ...state, 
        channels: [...state.channels, action.payload].sort((a, b) => a.name.localeCompare(b.name))
      };

    case 'UPDATE_CHANNEL':
      return {
        ...state,
        channels: state.channels.map(channel =>
          channel.id === action.payload.id ? action.payload : channel
        )
      };

    case 'REMOVE_CHANNEL':
      return {
        ...state,
        channels: state.channels.filter(channel => channel.id !== action.payload),
        activeChannelId: state.activeChannelId === action.payload ? undefined : state.activeChannelId,
        // Kanalın mesajlarını ve unread count'unu da temizle
        messages: Object.fromEntries(
          Object.entries(state.messages).filter(([channelId]) => channelId !== action.payload)
        ),
        unreadCounts: Object.fromEntries(
          Object.entries(state.unreadCounts).filter(([channelId]) => channelId !== action.payload)
        )
      };

    case 'SET_ACTIVE_CHANNEL':
      return { ...state, activeChannelId: action.payload };

    case 'SET_MESSAGES':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.channelId]: action.payload.messages
        }
      };

    case 'ADD_MESSAGE':
      const channelId = action.payload.channel_id;
      const currentMessages = state.messages[channelId] || [];
      
      // Duplicate mesaj kontrolü
      const messageExists = currentMessages.some(msg => msg.id === action.payload.id);
      if (messageExists) {
        return state; // Mesaj zaten var, state'i değiştirme
      }
      
      return {
        ...state,
        messages: {
          ...state.messages,
          [channelId]: [...currentMessages, action.payload].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        }
      };

    case 'UPDATE_MESSAGE':
      const updateChannelId = action.payload.channel_id;
      const updatedMessages = state.messages[updateChannelId] || [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [updateChannelId]: updatedMessages.map(msg =>
            msg.id === action.payload.id ? action.payload : msg
          )
        }
      };

    case 'REMOVE_MESSAGE':
      const removeChannelId = Object.keys(state.messages).find(channelId =>
        state.messages[channelId].some(msg => msg.id === action.payload)
      );
      if (!removeChannelId) return state;
      
      return {
        ...state,
        messages: {
          ...state.messages,
          [removeChannelId]: state.messages[removeChannelId].filter(msg => msg.id !== action.payload)
        }
      };

    case 'SET_TYPING_USERS':
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.channelId]: action.payload.users
        }
      };

    case 'SET_USER_PRESENCE':
      return {
        ...state,
        userPresence: {
          ...state.userPresence,
          [action.payload.userId]: action.payload.presence
        }
      };

    case 'SET_UNREAD_COUNT':
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [action.payload.channelId]: action.payload.count
        }
      };

    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.payload };

    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };

    case 'SET_MESSAGES_LOADING':
      return {
        ...state,
        messagesLoading: {
          ...state.messagesLoading,
          [action.payload.channelId]: action.payload.loading
        }
      };

    case 'SET_HAS_MORE_MESSAGES':
      return {
        ...state,
        hasMoreMessages: {
          ...state.hasMoreMessages,
          [action.payload.channelId]: action.payload.hasMore
        }
      };

    case 'PREPEND_MESSAGES':
      const prependChannelId = action.payload.channelId;
      const existingMessages = state.messages[prependChannelId] || [];
      
      // Duplicate kontrolü ile eski mesajları başa ekle
      const newMessages = action.payload.messages.filter(newMsg => 
        !existingMessages.some(existingMsg => existingMsg.id === newMsg.id)
      );
      
      return {
        ...state,
        messages: {
          ...state.messages,
          [prependChannelId]: [...newMessages, ...existingMessages].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        }
      };

    case 'CLEAR_SEARCH':
      return { ...state, searchResults: [], searchQuery: '' };

    default:
      return state;
  }
}

interface MessagingContextType {
  state: ChatState;
  
  // Channel operations
  loadChannels: () => Promise<void>;
  createChannel: (data: ChannelCreateData) => Promise<Channel | null>;
  joinChannel: (data: JoinChannelData) => Promise<boolean>;
  leaveChannel: (data: LeaveChannelData) => Promise<boolean>;
  setActiveChannel: (channelId: string) => void;
  
  // Message operations
  loadMessages: (channelId: string) => Promise<void>;
  loadOlderMessages: (channelId: string) => Promise<void>;
  sendMessage: (data: SendMessageData) => Promise<Message | null>;
  editMessage: (data: EditMessageData) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  addReaction: (data: ReactionData) => Promise<boolean>;
  removeReaction: (data: ReactionData) => Promise<boolean>;
  
  // Read status
  markAsRead: (data: MarkAsReadData) => Promise<void>;
  
  // Typing indicators
  startTyping: (channelId: string) => void;
  stopTyping: (channelId: string) => void;
  
  // Search
  searchMessages: (query: string) => Promise<void>;
  clearSearch: () => void;
  
  // Presence
  updatePresence: (status: UserPresence['status'], customStatus?: string) => Promise<void>;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export function MessagingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(messagingReducer, initialState);
  const { user } = useAuth();

  // Calculate unread counts - gerçek hesaplama
  const calculateUnreadCounts = useCallback(async (activeChannelId?: string) => {
    if (!user) return;

    try {
      // Kullanıcının tüm kanal üyeliklerini ve son okuma zamanlarını çek
      const { data: memberships } = await supabase
        .from('channel_members')
        .select('channel_id, last_read_at')
        .eq('user_id', user.id);

      if (!memberships) return;

      // Her kanal için okunmamış mesaj sayısını hesapla
      for (const membership of memberships) {
        const { channel_id, last_read_at } = membership;
        
        // Son okuma zamanından sonraki mesajları say (kendi mesajları hariç)
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', channel_id)
          .eq('is_deleted', false)
          .neq('user_id', user.id) // Kendi mesajlarını hariç tut
          .gt('created_at', last_read_at || '1970-01-01T00:00:00Z');

        // Aktif kanal değilse okunmamış sayısını güncelle
        if (channel_id !== (activeChannelId || state.activeChannelId)) {
          dispatch({
            type: 'SET_UNREAD_COUNT',
            payload: { channelId: channel_id, count: count || 0 }
          });
        } else {
          // Aktif kanalda okunmamış sayısını sıfırla
          dispatch({
            type: 'SET_UNREAD_COUNT',
            payload: { channelId: channel_id, count: 0 }
          });
        }
      }
    } catch (error) {
      console.error('Error calculating unread counts:', error);
    }
  }, [user]);

  // Simplified realtime subscriptions
  useEffect(() => {
    if (!user) return;

    let mounted = true;
    let realtimeChannel: any = null;

    const setupRealtime = () => {
      try {
        console.log(`🔌 Setting up realtime for user: ${user.id}`);
        
        // Benzersiz kanal adı
        const channelName = `user-${user.id}-${Date.now()}`;
        realtimeChannel = supabase.channel(channelName);

        // Listen to messages table changes
        realtimeChannel
          .on('postgres_changes',
            { 
              event: 'INSERT', 
              schema: 'public', 
              table: 'messages'
            },
            async (payload: any) => {
              if (!mounted) return;
              
              console.log('📨 New message received:', payload.new.id);
              
              try {
                // Check if user is member of this channel first
                const { data: membership } = await supabase
                  .from('channel_members')
                  .select('id')
                  .eq('channel_id', payload.new.channel_id)
                  .eq('user_id', user.id)
                  .limit(1);

                if (!membership || membership.length === 0) {
                  console.log('❌ User not member of channel:', payload.new.channel_id);
                  return;
                }

                // Get full message with relations
                const { data: message } = await supabase
                  .from('messages')
                  .select(`
                    *,
                    attachments:message_attachments(*),
                    reactions:message_reactions(*)
                  `)
                  .eq('id', payload.new.id)
                  .single();

                if (message && mounted) {
                  // Get user profile
                  let messageWithProfile = message;
                  if (message.user_id) {
                    const { data: userProfile } = await supabase
                      .from('user_profiles')
                      .select('user_id, first_name, last_name, profile_photo_url')
                      .eq('user_id', message.user_id)
                      .single();

                    messageWithProfile = {
                      ...message,
                      user_profile: userProfile
                    };
                  }

                  console.log('✅ Adding message to UI:', message.id);
                  dispatch({ type: 'ADD_MESSAGE', payload: messageWithProfile as Message });
                  
                  // Update unread counts immediately for realtime
                  const channelId = message.channel_id;
                  
                  // Eğer mesaj aktif kanalda değilse unread count'u artır
                  if (channelId !== state.activeChannelId && message.user_id !== user.id) {
                    const currentCount = state.unreadCounts[channelId] || 0;
                    dispatch({
                      type: 'SET_UNREAD_COUNT',
                      payload: { channelId, count: currentCount + 1 }
                    });
                  }
                }
              } catch (error) {
                console.error('❌ Error processing realtime message:', error);
              }
            }
          )
          // Listen to message updates (edits, deletions)
          .on('postgres_changes',
            { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'messages'
            },
            async (payload: any) => {
              if (!mounted) return;
              
              console.log('📝 Message updated:', payload.new.id);
              
              try {
                // Check if user is member of this channel
                const { data: membership } = await supabase
                  .from('channel_members')
                  .select('id')
                  .eq('channel_id', payload.new.channel_id)
                  .eq('user_id', user.id)
                  .limit(1);

                if (!membership || membership.length === 0) {
                  return;
                }

                // Get full updated message
                const { data: message } = await supabase
                  .from('messages')
                  .select(`
                    *,
                    attachments:message_attachments(*),
                    reactions:message_reactions(*)
                  `)
                  .eq('id', payload.new.id)
                  .single();

                if (message && mounted) {
                  // Get user profile
                  let messageWithProfile = message;
                  if (message.user_id) {
                    const { data: userProfile } = await supabase
                      .from('user_profiles')
                      .select('user_id, first_name, last_name, profile_photo_url')
                      .eq('user_id', message.user_id)
                      .single();

                    messageWithProfile = {
                      ...message,
                      user_profile: userProfile
                    };
                  }

                  dispatch({ type: 'UPDATE_MESSAGE', payload: messageWithProfile as Message });
                }
              } catch (error) {
                console.error('❌ Error processing message update:', error);
              }
            }
          )
          // Listen to channel changes
          .on('postgres_changes',
            { 
              event: '*', 
              schema: 'public', 
              table: 'channels'
            },
            async (payload: any) => {
              if (!mounted) return;
              
              if (payload.eventType === 'INSERT' && payload.new) {
                // Check if user is member of this new channel
                const { data: membership } = await supabase
                  .from('channel_members')
                  .select('id')
                  .eq('channel_id', payload.new.id)
                  .eq('user_id', user.id)
                  .limit(1);

                if (membership && membership.length > 0) {
                  dispatch({ type: 'ADD_CHANNEL', payload: payload.new as Channel });
                }
              } else if (payload.eventType === 'UPDATE' && payload.new) {
                dispatch({ type: 'UPDATE_CHANNEL', payload: payload.new as Channel });
              } else if (payload.eventType === 'DELETE' && payload.old) {
                dispatch({ type: 'REMOVE_CHANNEL', payload: payload.old.id });
              }
            }
          )
          // Listen to message attachments changes
          .on('postgres_changes',
            { 
              event: 'INSERT', 
              schema: 'public', 
              table: 'message_attachments'
            },
            async (payload: any) => {
              if (!mounted) return;
              
              console.log('📎 New attachment added:', payload.new.id);
              
              try {
                // Get the message this attachment belongs to
                const { data: message } = await supabase
                  .from('messages')
                  .select(`
                    *,
                    attachments:message_attachments(*),
                    reactions:message_reactions(*)
                  `)
                  .eq('id', payload.new.message_id)
                  .single();

                if (message && mounted) {
                  // Check if user is member of this channel
                  const { data: membership } = await supabase
                    .from('channel_members')
                    .select('id')
                    .eq('channel_id', message.channel_id)
                    .eq('user_id', user.id)
                    .limit(1);

                  if (!membership || membership.length === 0) {
                    return;
                  }

                  // Get user profile
                  let messageWithProfile = message;
                  if (message.user_id) {
                    const { data: userProfile } = await supabase
                      .from('user_profiles')
                      .select('user_id, first_name, last_name, profile_photo_url')
                      .eq('user_id', message.user_id)
                      .single();

                    messageWithProfile = {
                      ...message,
                      user_profile: userProfile
                    };
                  }

                  console.log('✅ Updating message with new attachment:', message.id);
                  dispatch({ type: 'UPDATE_MESSAGE', payload: messageWithProfile as Message });
                }
              } catch (error) {
                console.error('❌ Error processing attachment update:', error);
              }
            }
          )
          // Listen to channel member changes
          .on('postgres_changes',
            { 
              event: '*', 
              schema: 'public', 
              table: 'channel_members'
            },
            async (payload: any) => {
              if (!mounted) return;
              
              if (payload.eventType === 'INSERT' && payload.new) {
                // If this user was added to a channel, reload channels
                if (payload.new.user_id === user.id) {
                  // Use a ref to avoid dependency issues
                  setTimeout(async () => {
                    try {
                      if (!user) return;
                      
                      const { data: memberships } = await supabase
                        .from('channel_members')
                        .select('channel_id')
                        .eq('user_id', user.id);

                      if (!memberships || memberships.length === 0) {
                        dispatch({ type: 'SET_CHANNELS', payload: [] });
                        return;
                      }

                      const channelIds = memberships.map(m => m.channel_id);
                      const { data: channels } = await supabase
                        .from('channels')
                        .select('*')
                        .in('id', channelIds)
                        .eq('is_archived', false)
                        .order('name');

                      dispatch({ type: 'SET_CHANNELS', payload: channels || [] });
                    } catch (error) {
                      console.error('Error reloading channels:', error);
                    }
                  }, 500);
                }
              } else if (payload.eventType === 'UPDATE' && payload.new) {
                // If last_read_at was updated, recalculate unread counts
                if (payload.new.user_id === user.id && payload.new.last_read_at) {
                  setTimeout(() => calculateUnreadCounts(), 100);
                }
              } else if (payload.eventType === 'DELETE' && payload.old) {
                // If this user was removed from a channel, remove from UI
                if (payload.old.user_id === user.id) {
                  dispatch({ type: 'REMOVE_CHANNEL', payload: payload.old.channel_id });
                }
              }
            }
          )
          .subscribe((status: any) => {
            console.log(`🔄 Realtime status for ${user.id}:`, status);
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ WebSocket connected successfully for user:', user.id);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              console.log('❌ WebSocket connection failed for user:', user.id, 'Status:', status);
            }
          });

      } catch (error) {
        console.error('❌ Error setting up realtime:', error);
      }
    };

    const cleanup = () => {
      if (realtimeChannel) {
        console.log('🧹 Cleaning up realtime channel for user:', user.id);
        realtimeChannel.unsubscribe();
        realtimeChannel = null;
      }
    };

    // Initial setup
    setupRealtime();

    return () => {
      mounted = false;
      cleanup();
      console.log('🔌 Realtime completely cleaned up for user:', user.id);
    };
  }, [user?.id]); // Sadece user ID değiştiğinde yeniden bağlan

  // Check if user is member of a channel
  const isChannelMember = useCallback(async (channelId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('channel_members')
        .select('id, role')
        .eq('channel_id', channelId)
        .eq('user_id', user.id)
        .limit(1);

      return !error && data && data.length > 0;
    } catch (error) {
      console.error('Error checking channel membership:', error);
      return false;
    }
  }, [user]);

  // Load channels - only show channels user is member of
  const loadChannels = useCallback(async () => {
    if (!user) {
      dispatch({ type: 'SET_CHANNELS', payload: [] });
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Önce kullanıcının üye olduğu kanal ID'lerini çek
      const { data: memberships, error: membershipError } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', user.id);

      if (membershipError) {
        console.error('Membership error:', membershipError);
        throw membershipError;
      }

      if (!memberships || memberships.length === 0) {
        dispatch({ type: 'SET_CHANNELS', payload: [] });
        return;
      }

      const channelIds = memberships.map(m => m.channel_id);

      // Şimdi bu kanal ID'lerine ait kanalları çek
      const { data: channels, error } = await supabase
        .from('channels')
        .select('*')
        .in('id', channelIds)
        .eq('is_archived', false)
        .order('name');

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      dispatch({ type: 'SET_CHANNELS', payload: channels || [] });

      // Her kanal için son mesajları yükle (sidebar için)
      if (channels && channels.length > 0) {
        for (const channel of channels) {
          try {
            // Her kanal için son 1 mesajı çek (basit sorgu)
            const { data: lastMessage } = await supabase
              .from('messages')
              .select('*')
              .eq('channel_id', channel.id)
              .eq('is_deleted', false)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (lastMessage) {
              // User profile bilgilerini ayrı çek
              if (lastMessage.user_id) {
                const { data: userProfile } = await supabase
                  .from('user_profiles')
                  .select('user_id, first_name, last_name, profile_photo_url')
                  .eq('user_id', lastMessage.user_id)
                  .single();

                const messageWithProfile = {
                  ...lastMessage,
                  user_profile: userProfile
                };

                // Son mesajı state'e ekle
                dispatch({
                  type: 'SET_MESSAGES',
                  payload: { channelId: channel.id, messages: [messageWithProfile] }
                });
              } else {
                // User profile yoksa mesajı olduğu gibi ekle
                dispatch({
                  type: 'SET_MESSAGES',
                  payload: { channelId: channel.id, messages: [lastMessage] }
                });
              }
            }
          } catch (error) {
            // Mesaj yoksa hata normal, devam et
          }
        }
      }
    } catch (error) {
      console.error('Error loading channels:', error);
      dispatch({ type: 'SET_CHANNELS', payload: [] });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user]);

  // Load messages for a channel (initial load)
  const loadMessages = useCallback(async (channelId: string) => {
    try {
      // Önce kullanıcının bu kanalın üyesi olup olmadığını kontrol et
      const isMember = await isChannelMember(channelId);
      if (!isMember) {
        dispatch({
          type: 'SET_MESSAGES',
          payload: { channelId, messages: [] }
        });
        dispatch({
          type: 'SET_HAS_MORE_MESSAGES',
          payload: { channelId, hasMore: false }
        });
        return;
      }
      
      // Son 30 mesajı çek (initial load)
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          *,
          attachments:message_attachments(*),
          reactions:message_reactions(*)
        `)
        .eq('channel_id', channelId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(30);

      if (messagesError) {
        console.error('Database error loading messages:', messagesError);
        throw messagesError;
      }

      // Mesajları ters çevir (eskiden yeniye)
      const sortedMessages = (messages || []).reverse();

      // Eğer mesajlar varsa, user_profiles bilgilerini çek
      if (sortedMessages.length > 0) {
        const userIds = [...new Set(sortedMessages.map(m => m.user_id).filter(Boolean))];
        
        if (userIds.length > 0) {
          const { data: userProfiles } = await supabase
            .from('user_profiles')
            .select('user_id, first_name, last_name, profile_photo_url')
            .in('user_id', userIds);

          // Mesajlara user_profile bilgilerini ekle
          const messagesWithProfiles = sortedMessages.map(message => ({
            ...message,
            user_profile: userProfiles?.find(profile => profile.user_id === message.user_id)
          }));

          dispatch({
            type: 'SET_MESSAGES',
            payload: { channelId, messages: messagesWithProfiles }
          });
        } else {
          dispatch({
            type: 'SET_MESSAGES',
            payload: { channelId, messages: sortedMessages }
          });
        }

        // Daha eski mesaj var mı kontrol et
        dispatch({
          type: 'SET_HAS_MORE_MESSAGES',
          payload: { channelId, hasMore: messages?.length === 30 }
        });
      } else {
        dispatch({
          type: 'SET_MESSAGES',
          payload: { channelId, messages: [] }
        });
        dispatch({
          type: 'SET_HAS_MORE_MESSAGES',
          payload: { channelId, hasMore: false }
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      dispatch({
        type: 'SET_MESSAGES',
        payload: { channelId, messages: [] }
      });
      dispatch({
        type: 'SET_HAS_MORE_MESSAGES',
        payload: { channelId, hasMore: false }
      });
    }
  }, [isChannelMember]);

  // Load older messages (pagination)
  const loadOlderMessages = useCallback(async (channelId: string) => {
    try {
      const currentMessages = state.messages[channelId] || [];
      if (currentMessages.length === 0) return;

      // Loading durumunu set et
      dispatch({
        type: 'SET_MESSAGES_LOADING',
        payload: { channelId, loading: true }
      });

      // En eski mesajın tarihini al
      const oldestMessage = currentMessages[0];
      const oldestDate = oldestMessage.created_at;

      // Bu tarihten daha eski 30 mesajı çek
      const { data: olderMessages, error } = await supabase
        .from('messages')
        .select(`
          *,
          attachments:message_attachments(*),
          reactions:message_reactions(*)
        `)
        .eq('channel_id', channelId)
        .eq('is_deleted', false)
        .lt('created_at', oldestDate)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Error loading older messages:', error);
        return;
      }

      if (olderMessages && olderMessages.length > 0) {
        // Mesajları ters çevir (eskiden yeniye)
        const sortedOlderMessages = olderMessages.reverse();

        // User profiles bilgilerini çek
        const userIds = [...new Set(sortedOlderMessages.map(m => m.user_id).filter(Boolean))];
        
        if (userIds.length > 0) {
          const { data: userProfiles } = await supabase
            .from('user_profiles')
            .select('user_id, first_name, last_name, profile_photo_url')
            .in('user_id', userIds);

          // Mesajlara user_profile bilgilerini ekle
          const messagesWithProfiles = sortedOlderMessages.map(message => ({
            ...message,
            user_profile: userProfiles?.find(profile => profile.user_id === message.user_id)
          }));

          // Eski mesajları başa ekle
          dispatch({
            type: 'PREPEND_MESSAGES',
            payload: { channelId, messages: messagesWithProfiles }
          });
        } else {
          dispatch({
            type: 'PREPEND_MESSAGES',
            payload: { channelId, messages: sortedOlderMessages }
          });
        }

        // Daha eski mesaj var mı kontrol et
        dispatch({
          type: 'SET_HAS_MORE_MESSAGES',
          payload: { channelId, hasMore: olderMessages.length === 30 }
        });
      } else {
        // Daha eski mesaj yok
        dispatch({
          type: 'SET_HAS_MORE_MESSAGES',
          payload: { channelId, hasMore: false }
        });
      }
    } catch (error) {
      console.error('Error loading older messages:', error);
    } finally {
      // Loading durumunu kapat
      dispatch({
        type: 'SET_MESSAGES_LOADING',
        payload: { channelId, loading: false }
      });
    }
  }, [state.messages]);

  // Send message
  const sendMessage = useCallback(async (data: SendMessageData): Promise<Message | null> => {
    if (!user) return null;

    try {
      // Önce kullanıcının bu kanalın üyesi olup olmadığını kontrol et
      const isMember = await isChannelMember(data.channel_id);
      if (!isMember) {
        return null;
      }
      
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          channel_id: data.channel_id,
          user_id: user.id,
          content: data.content,
          message_type: data.message_type || 'text',
          parent_message_id: data.parent_message_id,
          metadata: data.metadata || {}
        })
        .select(`
          *,
          attachments:message_attachments(*),
          reactions:message_reactions(*)
        `)
        .single();

      if (error) {
        console.error('Database error sending message:', error);
        throw error;
      }

      // Gönderilen mesaja user_profile bilgilerini ekle
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name, profile_photo_url')
        .eq('user_id', user.id)
        .single();

      const messageWithProfile = {
        ...message,
        user_profile: userProfile
      };
      
      // Mesajı hemen UI'da göster
      dispatch({ type: 'ADD_MESSAGE', payload: messageWithProfile as Message });
      
      return messageWithProfile as Message;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }, [user, isChannelMember]);

  // Create channel
  const createChannel = useCallback(async (data: ChannelCreateData): Promise<Channel | null> => {
    if (!user) return null;

    try {
      const { data: channel, error } = await supabase
        .from('channels')
        .insert({
          name: data.name,
          description: data.description,
          type: data.type,
          created_by: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Database error creating channel:', error);
        throw error;
      }

      // Add creator as admin
      await supabase
        .from('channel_members')
        .insert({
          channel_id: channel.id,
          user_id: user.id,
          role: 'admin'
        });

      return channel as Channel;
    } catch (error) {
      console.error('Error creating channel:', error);
      return null;
    }
  }, [user]);

  // Join channel
  const joinChannel = useCallback(async (data: JoinChannelData): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('channel_members')
        .insert({
          channel_id: data.channel_id,
          user_id: user.id,
          role: 'member'
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error joining channel:', error);
      return false;
    }
  }, [user]);

  // Leave channel
  const leaveChannel = useCallback(async (data: LeaveChannelData): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', data.channel_id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Kullanıcı kanaldan ayrıldıktan sonra state'den kanalı kaldır
      dispatch({ type: 'REMOVE_CHANNEL', payload: data.channel_id });
      
      // Eğer aktif kanal bu kanaldı, aktif kanalı temizle
      if (state.activeChannelId === data.channel_id) {
        dispatch({ type: 'SET_ACTIVE_CHANNEL', payload: '' });
      }

      return true;
    } catch (error) {
      console.error('Error leaving channel:', error);
      return false;
    }
  }, [user, state.activeChannelId]);

  // Edit message
  const editMessage = useCallback(async (data: EditMessageData): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ content: data.content })
        .eq('id', data.message_id)
        .eq('user_id', user.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error editing message:', error);
      return false;
    }
  }, [user]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: true })
        .eq('id', messageId)
        .eq('user_id', user.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }, [user]);

  // Add reaction
  const addReaction = useCallback(async (data: ReactionData): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: data.message_id,
          user_id: user.id,
          emoji: data.emoji
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding reaction:', error);
      return false;
    }
  }, [user]);

  // Remove reaction
  const removeReaction = useCallback(async (data: ReactionData): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', data.message_id)
        .eq('user_id', user.id)
        .eq('emoji', data.emoji);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing reaction:', error);
      return false;
    }
  }, [user]);

  // Mark as read
  const markAsRead = useCallback(async (data: MarkAsReadData): Promise<void> => {
    if (!user) return;

    try {
      await supabase
        .from('channel_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('channel_id', data.channel_id)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [user]);

  // Search messages
  const searchMessages = useCallback(async (query: string): Promise<void> => {
    if (!user || !query.trim()) {
      dispatch({ type: 'CLEAR_SEARCH' });
      return;
    }

    try {
      dispatch({ type: 'SET_SEARCH_QUERY', payload: query });

      const { data: results, error } = await supabase
        .from('messages')
        .select(`
          *,
          channel:channels(*)
        `)
        .textSearch('content', query)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const searchResults: MessageSearchResult[] = (results || []).map(result => ({
        message: result as Message,
        channel: result.channel as Channel,
        highlight: result.content || ''
      }));

      dispatch({ type: 'SET_SEARCH_RESULTS', payload: searchResults });
    } catch (error) {
      console.error('Error searching messages:', error);
    }
  }, [user]);

  // Clear search
  const clearSearch = useCallback(() => {
    dispatch({ type: 'CLEAR_SEARCH' });
  }, []);

  // Set active channel
  const setActiveChannel = useCallback((channelId: string) => {
    dispatch({ type: 'SET_ACTIVE_CHANNEL', payload: channelId });
    loadMessages(channelId);
    markAsRead({ channel_id: channelId });
    // Okunmamış sayıları güncelle - yeni aktif kanal ID'sini geç
    setTimeout(() => calculateUnreadCounts(channelId), 500);
  }, [loadMessages, markAsRead, calculateUnreadCounts]);

  // Update presence
  const updatePresence = useCallback(async (status: UserPresence['status'], customStatus?: string): Promise<void> => {
    if (!user) return;

    try {
      await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          status,
          custom_status: customStatus,
          last_seen: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [user]);

  // Typing indicators (placeholder implementations)
  const startTyping = useCallback((channelId: string) => {
    // Implementation would use realtime channels for typing indicators
  }, []);

  const stopTyping = useCallback((channelId: string) => {
    // Implementation would use realtime channels for typing indicators
  }, []);

  // Load initial data
  useEffect(() => {
    if (user) {
      loadChannels();
      updatePresence('online');
    }
  }, [user, loadChannels, updatePresence]);

  // Calculate unread counts on initial load
  useEffect(() => {
    if (user) {
      setTimeout(() => calculateUnreadCounts(), 1000);
    }
  }, [user]);

  // Listen for manual message updates from MessageInput
  useEffect(() => {
    const handleMessageUpdate = (event: CustomEvent) => {
      const updatedMessage = event.detail;
      if (updatedMessage) {
        console.log('📨 Manual message update received:', updatedMessage.id);
        dispatch({ type: 'UPDATE_MESSAGE', payload: updatedMessage });
      }
    };

    window.addEventListener('messageUpdated', handleMessageUpdate as EventListener);
    
    return () => {
      window.removeEventListener('messageUpdated', handleMessageUpdate as EventListener);
    };
  }, []);

  const value: MessagingContextType = {
    state,
    loadChannels,
    createChannel,
    joinChannel,
    leaveChannel,
    setActiveChannel,
    loadMessages,
    loadOlderMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    markAsRead,
    startTyping,
    stopTyping,
    searchMessages,
    clearSearch,
    updatePresence
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
}
