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
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: Message }
  | { type: 'REMOVE_MESSAGE'; payload: string }
  | { type: 'SET_TYPING_USERS'; payload: { channelId: string; users: TypingIndicator[] } }
  | { type: 'SET_USER_PRESENCE'; payload: { userId: string; presence: UserPresence } }
  | { type: 'SET_UNREAD_COUNT'; payload: { channelId: string; count: number } }
  | { type: 'SET_SEARCH_RESULTS'; payload: MessageSearchResult[] }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
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
  searchQuery: ''
};

function messagingReducer(state: ChatState, action: MessagingAction): ChatState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_CHANNELS':
      return { ...state, channels: action.payload };

    case 'ADD_CHANNEL':
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
        activeChannelId: state.activeChannelId === action.payload ? undefined : state.activeChannelId
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

  // Realtime subscriptions with polling fallback
  useEffect(() => {
    if (!user) return;

    let mounted = true;
    let pollingInterval: NodeJS.Timeout;
    let lastMessageCheck = Date.now();
    let lastChannelCheck = Date.now();

    const setupRealtime = async () => {
      try {
        console.log('Setting up realtime with polling fallback...');

        // Try WebSocket first, fallback to polling
        let usePolling = false;

        try {
          // Test WebSocket connection
          const testChannel = supabase.channel('test-connection');
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('WebSocket timeout'));
            }, 3000);

            testChannel.subscribe((status) => {
              clearTimeout(timeout);
              if (status === 'SUBSCRIBED') {
                resolve(status);
              } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                reject(new Error('WebSocket failed'));
              }
            });
          });

          testChannel.unsubscribe();
          console.log('WebSocket connection successful, using realtime');

          // Setup WebSocket subscriptions
          const channelsChannel = supabase.channel(`channels-${user.id}`);
          const messagesChannel = supabase.channel(`messages-${user.id}`);

          channelsChannel
            .on('postgres_changes', 
              { event: '*', schema: 'public', table: 'channels' },
              (payload) => {
                if (!mounted) return;
                console.log('Channel change:', payload);
                if (payload.eventType === 'INSERT') {
                  dispatch({ type: 'ADD_CHANNEL', payload: payload.new as Channel });
                } else if (payload.eventType === 'UPDATE') {
                  dispatch({ type: 'UPDATE_CHANNEL', payload: payload.new as Channel });
                } else if (payload.eventType === 'DELETE') {
                  dispatch({ type: 'REMOVE_CHANNEL', payload: payload.old.id });
                }
              }
            )
            .subscribe();

          messagesChannel
            .on('postgres_changes',
              { event: '*', schema: 'public', table: 'messages' },
              async (payload) => {
                if (!mounted) return;
                console.log('Message change:', payload);
                if (payload.eventType === 'INSERT') {
                  try {
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
                      // User profile bilgilerini de çek
                      if (message.user_id) {
                        const { data: userProfile } = await supabase
                          .from('user_profiles')
                          .select('user_id, first_name, last_name, profile_photo_url')
                          .eq('user_id', message.user_id)
                          .single();

                        const messageWithProfile = {
                          ...message,
                          user_profile: userProfile
                        };

                        dispatch({ type: 'ADD_MESSAGE', payload: messageWithProfile as Message });
                        // Okunmamış sayıları güncelle
                        setTimeout(() => calculateUnreadCounts(), 100);
                      } else {
                        dispatch({ type: 'ADD_MESSAGE', payload: message as Message });
                        // Okunmamış sayıları güncelle
                        setTimeout(() => calculateUnreadCounts(), 100);
                      }
                    }
                  } catch (error) {
                    console.error('Error loading message details:', error);
                  }
                }
              }
            )
            .subscribe();

        } catch (wsError) {
          console.log('WebSocket failed, falling back to polling:', wsError);
          usePolling = true;
        }

        if (usePolling) {
          console.log('Using polling for realtime updates');
          
          // Polling function
          const pollForUpdates = async () => {
            if (!mounted) return;

            try {
              // Check for new messages
              const { data: newMessages } = await supabase
                .from('messages')
                .select(`
                  *,
                  attachments:message_attachments(*),
                  reactions:message_reactions(*)
                `)
                .gte('created_at', new Date(lastMessageCheck).toISOString())
                .eq('is_deleted', false)
                .order('created_at', { ascending: true });

              if (newMessages && newMessages.length > 0) {
                // User profiles bilgilerini çek
                const userIds = [...new Set(newMessages.map(m => m.user_id).filter(Boolean))];
                
                if (userIds.length > 0) {
                  const { data: userProfiles } = await supabase
                    .from('user_profiles')
                    .select('user_id, first_name, last_name, profile_photo_url')
                    .in('user_id', userIds);

                  // Mesajlara user_profile bilgilerini ekle
                  const messagesWithProfiles = newMessages.map(message => ({
                    ...message,
                    user_profile: userProfiles?.find(profile => profile.user_id === message.user_id)
                  }));

                  messagesWithProfiles.forEach(message => {
                    dispatch({ type: 'ADD_MESSAGE', payload: message as Message });
                  });
                } else {
                  newMessages.forEach(message => {
                    dispatch({ type: 'ADD_MESSAGE', payload: message as Message });
                  });
                }
                
                // Okunmamış sayıları güncelle
                setTimeout(() => calculateUnreadCounts(), 100);
                lastMessageCheck = Date.now();
              }

              // Check for new channels
              const { data: newChannels } = await supabase
                .from('channels')
                .select('*')
                .gte('created_at', new Date(lastChannelCheck).toISOString())
                .eq('is_archived', false);

              if (newChannels && newChannels.length > 0) {
                newChannels.forEach(channel => {
                  dispatch({ type: 'ADD_CHANNEL', payload: channel as Channel });
                });
                lastChannelCheck = Date.now();
              }
            } catch (error) {
              console.error('Polling error:', error);
            }
          };

          // Start polling every 2 seconds
          pollingInterval = setInterval(pollForUpdates, 2000);
        }

        console.log('Realtime setup complete');
      } catch (error) {
        console.error('Error setting up realtime:', error);
        console.log('Continuing without realtime features');
      }
    };

    setupRealtime();

    return () => {
      mounted = false;
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      console.log('Realtime cleaned up');
    };
  }, [user]);

  // Check if user is member of a channel
  const isChannelMember = useCallback(async (channelId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('channel_members')
        .select('id')
        .eq('channel_id', channelId)
        .eq('user_id', user.id)
        .single();

      return !error && !!data;
    } catch (error) {
      return false;
    }
  }, [user]);

  // Load channels - only show channels user is member of
  const loadChannels = useCallback(async () => {
    if (!user) {
      console.log('No user, skipping channel load');
      dispatch({ type: 'SET_CHANNELS', payload: [] });
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      console.log('Loading channels from database for user:', user.id);

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
        console.log('User is not a member of any channels');
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
      console.log('Successfully loaded channels from database:', channels?.length || 0);

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
            console.log(`No messages found for channel ${channel.name}`);
          }
        }
      }
    } catch (error) {
      console.error('Error loading channels:', error);
      dispatch({ type: 'SET_CHANNELS', payload: [] });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Load messages for a channel
  const loadMessages = useCallback(async (channelId: string) => {
    try {
      console.log('Loading messages for channel from database:', channelId);
      
      // Önce kullanıcının bu kanalın üyesi olup olmadığını kontrol et
      const isMember = await isChannelMember(channelId);
      if (!isMember) {
        console.warn('User is not a member of this channel:', channelId);
        dispatch({
          type: 'SET_MESSAGES',
          payload: { channelId, messages: [] }
        });
        return;
      }
      
      // Mesajları çek
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          *,
          attachments:message_attachments(*),
          reactions:message_reactions(*)
        `)
        .eq('channel_id', channelId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(50);

      if (messagesError) {
        console.error('Database error loading messages:', messagesError);
        throw messagesError;
      }

      // Eğer mesajlar varsa, user_profiles bilgilerini çek
      if (messages && messages.length > 0) {
        const userIds = [...new Set(messages.map(m => m.user_id).filter(Boolean))];
        
        if (userIds.length > 0) {
          const { data: userProfiles } = await supabase
            .from('user_profiles')
            .select('user_id, first_name, last_name, profile_photo_url')
            .in('user_id', userIds);

          // Mesajlara user_profile bilgilerini ekle
          const messagesWithProfiles = messages.map(message => ({
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
            payload: { channelId, messages }
          });
        }
      } else {
        dispatch({
          type: 'SET_MESSAGES',
          payload: { channelId, messages: [] }
        });
      }
      
      console.log('Successfully loaded messages from database:', messages?.length || 0);
    } catch (error) {
      console.error('Error loading messages:', error);
      dispatch({
        type: 'SET_MESSAGES',
        payload: { channelId, messages: [] }
      });
    }
  }, []);

  // Send message
  const sendMessage = useCallback(async (data: SendMessageData): Promise<Message | null> => {
    if (!user) return null;

    try {
      console.log('Sending message to database:', data);
      
      // Önce kullanıcının bu kanalın üyesi olup olmadığını kontrol et
      const isMember = await isChannelMember(data.channel_id);
      if (!isMember) {
        console.warn('User is not a member of this channel, cannot send message:', data.channel_id);
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

      console.log('Successfully sent message to database:', message.content);
      return messageWithProfile as Message;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }, [user]);

  // Create channel
  const createChannel = useCallback(async (data: ChannelCreateData): Promise<Channel | null> => {
    if (!user) return null;

    try {
      console.log('Creating channel in database:', data);
      
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

      console.log('Successfully created channel in database:', channel.name);
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

  const value: MessagingContextType = {
    state,
    loadChannels,
    createChannel,
    joinChannel,
    leaveChannel,
    setActiveChannel,
    loadMessages,
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
