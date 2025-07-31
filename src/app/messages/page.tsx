'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Channel, Message, UserProfile, MessageRead, ChannelMember } from '@/types';

// Extended Channel type with last message info
interface ChannelWithLastMessage extends Channel {
  last_message?: {
    content: string;
    sender_name: string;
    created_at: string;
  };
  unread_count?: number;
  is_current_member?: boolean;
}

// Simplified type for channel members with role information
interface ChannelMemberWithProfile {
  id: string;
  first_name: string;
  last_name: string;
  profile_photo_url?: string;
  position?: string;
  role: 'member' | 'manager';
}
import { Send, Hash, Users, Plus, Search, X, Check, ArrowLeft, Shield, Crown } from 'lucide-react';

export default function MessagesPage() {
  const { user, userProfile } = useAuth();
  const [channels, setChannels] = useState<ChannelWithLastMessage[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [channelMembers, setChannelMembers] = useState<ChannelMemberWithProfile[]>([]);
  const [channelMembersWithRoles, setChannelMembersWithRoles] = useState<ChannelMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [showReadByModal, setShowReadByModal] = useState(false);
  const [selectedMessageReads, setSelectedMessageReads] = useState<MessageRead[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Channel management permission checks
  const isChannelCreator = (channel: Channel) => {
    return user?.id === channel.created_by;
  };

  const isChannelManager = (channelId: string) => {
    if (!user || !selectedChannel) return false;
    const memberWithRole = channelMembersWithRoles.find(m => m.user_id === user.id);
    return memberWithRole?.role === 'manager' || isChannelCreator(selectedChannel);
  };

  const canManageMembers = () => {
    if (!selectedChannel || !user) {
      return false;
    }
    const isCreator = isChannelCreator(selectedChannel);
    const isManager = isChannelManager(selectedChannel.id);
    return isCreator || isManager;
  };

  // Load channel members with roles
  const loadChannelMembers = async (channelId: string) => {
    setLoadingMembers(true);
    try {
      // Check if user is authenticated
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        setChannelMembers([]);
        setChannelMembersWithRoles([]);
        return;
      }
      
      // Get members for this channel
      const { data: membersData, error: membersError } = await supabase
        .from('channel_members')
        .select('user_id, role, joined_at')
        .eq('channel_id', channelId);

      if (membersError) {
        console.error('Error loading channel members:', membersError);
        setChannelMembers([]);
        setChannelMembersWithRoles([]);
        return;
      }
      
      if (!membersData || membersData.length === 0) {
        setChannelMembers([]);
        setChannelMembersWithRoles([]);
        return;
      }
      
      // Get user profiles
      const userIds = membersData.map(m => m.user_id);
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, profile_photo_url, position')
        .in('id', userIds);

      if (usersError) {
        console.error('Error loading user profiles:', usersError);
        setChannelMembers([]);
        setChannelMembersWithRoles([]);
        return;
      }
      
      // Combine data
      const membersWithRoles = usersData?.map(user => {
        const memberData = membersData.find(m => m.user_id === user.id);
        return {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          profile_photo_url: user.profile_photo_url,
          position: user.position,
          role: memberData?.role || 'member'
        };
      }) || [];
      
      setChannelMembers(membersWithRoles as ChannelMemberWithProfile[]);
      setChannelMembersWithRoles(membersData.map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        channel_id: channelId,
        joined_at: m.joined_at
      })) as ChannelMember[]);
      
    } catch (error) {
      console.error('Unexpected error in loadChannelMembers:', error);
      setChannelMembers([]);
      setChannelMembersWithRoles([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Load all users for channel creation
  const loadAllUsers = async () => {
    try {
      const { data: usersData, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, profile_photo_url, position')
        .eq('status', 'active');

      if (error) throw error;

      setAllUsers(usersData as any[] || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // Add member to channel
  const addMemberToChannel = async (userId: string) => {
    if (!selectedChannel) return;

    try {
      const { error } = await supabase
        .from('channel_members')
        .insert({
          channel_id: selectedChannel.id,
          user_id: userId,
          role: 'member'
        });

      if (error) {
        console.error('Error adding member:', error);
        throw error;
      }

      // Refresh channel members
      await loadChannelMembers(selectedChannel.id);
    } catch (error: any) {
      console.error('Error adding member:', error);
      alert(`Üye eklenirken hata oluştu: ${error?.message || 'Bilinmeyen hata'}`);
    }
  };

  // Remove member from channel
  const removeMemberFromChannel = async (userId: string) => {
    if (!selectedChannel) {
      console.error('No selected channel');
      return;
    }

    console.log('Removing member:', {
      userId,
      channelId: selectedChannel.id
    });

    try {
      const { data, error } = await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', selectedChannel.id)
        .eq('user_id', userId)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Member removal successful:', data);

      // Refresh channel members
      await loadChannelMembers(selectedChannel.id);
    } catch (error) {
      console.error('Error removing member:', error);
      alert(`Üye çıkarılırken hata oluştu: ${(error as any)?.message || 'Bilinmeyen hata'}`);
    }
  };

  // Toggle member role between member and manager
  const toggleMemberRole = async (userId: string, currentRole: string) => {
    if (!selectedChannel) {
      console.error('No selected channel');
      return;
    }

    const newRole = currentRole === 'manager' ? 'member' : 'manager';
    
    console.log('Toggling role:', {
      userId,
      currentRole,
      newRole,
      channelId: selectedChannel.id
    });
    
    try {
      const { data, error } = await supabase
        .from('channel_members')
        .update({ role: newRole })
        .eq('channel_id', selectedChannel.id)
        .eq('user_id', userId)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Role update successful:', data);

      // Refresh channel members
      await loadChannelMembers(selectedChannel.id);
    } catch (error) {
      console.error('Error updating member role:', error);
      alert(`Üye rolü güncellenirken hata oluştu: ${(error as any)?.message || 'Bilinmeyen hata'}`);
    }
  };

  // Create new channel
  const createChannel = async () => {
    if (!newChannelName.trim() || !user) return;

    try {
      const { data: channelData, error } = await supabase
        .from('channels')
        .insert({
          name: newChannelName.trim(),
          description: newChannelDescription.trim() || null,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Prepare members to add (creator as manager + selected members as regular members)
      const memberInserts = [
        // Creator as manager
        {
          channel_id: channelData.id,
          user_id: user.id,
          role: 'manager'
        },
        // Selected members as regular members
        ...selectedMembers.map(userId => ({
          channel_id: channelData.id,
          user_id: userId,
          role: 'member'
        }))
      ];

      // Add all members to channel
      const { error: membersError } = await supabase
        .from('channel_members')
        .insert(memberInserts);

      if (membersError) throw membersError;

      // Update channels list
      setChannels(prev => [...prev, channelData]);
      setSelectedChannel(channelData);

      // Reset form and close modal
      setNewChannelName('');
      setNewChannelDescription('');
      setSelectedMembers([]);
      setShowCreateChannelModal(false);
    } catch (error) {
      console.error('Error creating channel:', error);
      alert('Kanal oluşturulurken hata oluştu.');
    }
  };

  // Scroll to bottom when new messages arrive
  const scrollToBottom = (instant = false) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: instant ? 'auto' : 'smooth' 
    });
  };

  useEffect(() => {
    // Loading sırasında scroll yapma
    if (loadingMessages) return;
    
    // Sadece kullanıcı kanal üyesiyse scroll yap
    if (isCurrentUserMember() && messages.length > 0) {
      // Mesajlar yüklendikten sonra direkt en sona konumlandır (görünmez)
      // Önce container'ı en sona scroll et, sonra görünür yap
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }
  }, [messages, loadingMessages]);

  // Mark messages as read when they come into view
  useEffect(() => {
    if (!messagesContainerRef.current || !user || !selectedChannel || loadingMessages) return;

    // Sadece mesajlar yüklendikten sonra observer'ı başlat
    const timer = setTimeout(() => {
      if (!messagesContainerRef.current) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const visibleMessageIds: string[] = [];
          
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
              const messageId = entry.target.getAttribute('data-message-id');
              const senderId = entry.target.getAttribute('data-sender-id');
              
              // Only mark messages from other users as read, and ignore temporary messages
              if (messageId && !messageId.startsWith('temp-') && senderId && senderId !== user.id) {
                visibleMessageIds.push(messageId);
              }
            }
          });

          if (visibleMessageIds.length > 0) {
            markMessagesAsRead(visibleMessageIds);
          }
        },
        {
          root: messagesContainerRef.current,
          threshold: [0.7], // Message is considered read when 70% visible
          rootMargin: '0px 0px -20px 0px' // Only trigger when message is well within view
        }
      );

      // Observe all message elements
      const messageElements = messagesContainerRef.current.querySelectorAll('[data-message-id]');
      messageElements.forEach((element) => observer.observe(element));

      return () => {
        observer.disconnect();
      };
    }, 1000); // 1 saniye bekle

    return () => {
      clearTimeout(timer);
    };
  }, [messages, user, selectedChannel, loadingMessages]);

  // Load channels
  useEffect(() => {
    if (!user) return;

    const loadChannels = async () => {
      try {
        // Get channels where user is currently a member
        const { data: currentMemberChannels, error: memberError } = await supabase
          .from('channel_members')
          .select('channel_id, role')
          .eq('user_id', user.id);

        if (memberError) throw memberError;

        // For now, only show current member channels
        // TODO: Add history table later for showing past channels
        const currentChannelIds = currentMemberChannels?.map(m => m.channel_id) || [];

        if (currentChannelIds.length === 0) {
          setChannels([]);
          return;
        }

        // Get channels data for current member channels
        const { data: channelsData, error } = await supabase
          .from('channels')
          .select('*')
          .in('id', currentChannelIds)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Get last message and unread count for each channel
        const channelsWithLastMessage = await Promise.all(
          (channelsData || []).map(async (channel) => {
            try {
              // Check if user is currently a member
              const isCurrentMember = currentChannelIds.includes(channel.id);
              
              // Get last message
              const { data: lastMessageData } = await supabase
                .from('messages')
                .select('content, created_at, sender_id')
                .eq('channel_id', channel.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

              let unreadCount = 0;
              
              // Only calculate unread count if user is currently a member
              if (isCurrentMember) {
                // Get all messages from this channel (except own messages)
                const { data: allMessages } = await supabase
                  .from('messages')
                  .select('id')
                  .eq('channel_id', channel.id)
                  .not('sender_id', 'eq', user.id);

                if (allMessages && allMessages.length > 0) {
                  const messageIds = allMessages.map(m => m.id);
                  
                  // Get messages that user has already read
                  const { data: readMessages } = await supabase
                    .from('message_reads')
                    .select('message_id')
                    .eq('user_id', user.id)
                    .in('message_id', messageIds);

                  const readMessageIds = readMessages?.map(r => r.message_id) || [];
                  unreadCount = messageIds.filter(id => !readMessageIds.includes(id)).length;
                } else {
                  unreadCount = 0;
                }
              }

              if (!lastMessageData) {
                return { 
                  ...channel, 
                  unread_count: unreadCount || 0,
                  is_current_member: isCurrentMember
                };
              }

              // Get sender info
              const { data: senderData } = await supabase
                .from('user_profiles')
                .select('first_name, last_name')
                .eq('id', lastMessageData.sender_id)
                .single();

              return {
                ...channel,
                last_message: {
                  content: lastMessageData.content,
                  sender_name: senderData ? 
                    `${senderData.first_name || ''} ${senderData.last_name || ''}`.trim() || 'Kullanıcı' :
                    'Kullanıcı',
                  created_at: lastMessageData.created_at
                },
                unread_count: unreadCount || 0,
                is_current_member: isCurrentMember
              };
            } catch {
              // If no messages, return channel without last_message
              return { 
                ...channel, 
                unread_count: 0,
                is_current_member: currentChannelIds.includes(channel.id)
              };
            }
          })
        );

        setChannels(channelsWithLastMessage);
        
        // Don't select any channel by default - let user choose
        // setSelectedChannel(null); // Already null by default
      } catch (error) {
        console.error('Error loading channels:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
      } finally {
        setLoading(false);
      }
    };

    loadChannels();
  }, [user]);

  // Load members when channel changes
  useEffect(() => {
    if (selectedChannel) {
      // Kanal değiştiğinde loading state'ini set et ama mevcut verileri temizleme
      setLoadingMembers(true);
      loadChannelMembers(selectedChannel.id);
    }
  }, [selectedChannel?.id]);

  // Check if selected channel is still available to user
  useEffect(() => {
    if (selectedChannel && channels.length > 0) {
      const channelStillExists = channels.some(ch => ch.id === selectedChannel.id);
      if (!channelStillExists) {
        // If selected channel is no longer available, clear selection
        setSelectedChannel(null);
        setMessages([]);
      }
    }
  }, [channels, selectedChannel]);

  // Check if current user is still a member of the selected channel
  const isCurrentUserMember = () => {
    if (!user || !selectedChannel) return true;
    
    // Loading sırasında veya henüz veri yüklenmemişse true döndür
    if (loadingMembers || channelMembersWithRoles.length === 0) return true;
    
    // Sadece bu kanal için üyelik kontrolü yap
    const currentChannelMembers = channelMembersWithRoles.filter(
      member => member.channel_id === selectedChannel.id
    );
    
    // Eğer bu kanal için hiç üye verisi yoksa (henüz yüklenmemiş), true döndür
    if (currentChannelMembers.length === 0) return true;
    
    return currentChannelMembers.some(member => member.user_id === user.id);
  };

  // Mark messages as read and broadcast the event
  const markMessagesAsRead = async (messageIds: string[]) => {
    if (!user || !selectedChannel || messageIds.length === 0) return;

    try {
      const { data: existingReads } = await supabase
        .from('message_reads')
        .select('message_id')
        .eq('user_id', user.id)
        .in('message_id', messageIds);

      const readMessageIds = existingReads?.map((r) => r.message_id) || [];
      const unreadMessageIds = messageIds.filter((id) => !readMessageIds.includes(id));

      if (unreadMessageIds.length > 0) {
        const readsToInsert = unreadMessageIds.map((messageId) => ({
          message_id: messageId,
          user_id: user.id,
        }));

        console.log('Attempting to insert read receipts:', JSON.stringify(readsToInsert, null, 2));

        const { data, error } = await supabase.from('message_reads').insert(readsToInsert).select();
        
        if (error) {
            console.error('Supabase insert error details:', error);
            throw error;
        }

        // Broadcast that messages have been read
        const channel = supabase.channel(`channel-${selectedChannel.id}`);
        channel.send({
          type: 'broadcast',
          event: 'message_read',
          payload: { reads: data, user: userProfile },
        });

        // Update unread count in channel list
        setChannels(prevChannels => 
          prevChannels.map(ch => 
            ch.id === selectedChannel.id 
              ? {
                  ...ch,
                  unread_count: Math.max(0, (ch.unread_count || 0) - unreadMessageIds.length)
                }
              : ch
          )
        );
      }
    } catch (error) {
      console.error('Error in markMessagesAsRead function:', error);
    }
  };

  // Load messages for selected channel using RPC
  useEffect(() => {
    if (!selectedChannel || !user) return;

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const { data, error } = await supabase.rpc('get_messages_for_channel', {
          p_channel_id: selectedChannel.id,
        });

        if (error) {
          console.error('Error loading messages via RPC:', error);
          throw error;
        }
        
        setMessages(data || []);

      } catch (error) {
        console.error('Error in loadMessages function:', error);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [selectedChannel, user]);

  // Separate useEffect for realtime subscriptions
  useEffect(() => {
    if (!selectedChannel || !user) return;

    const channelIdentifier = `channel-${selectedChannel.id}`;
    const channel = supabase.channel(channelIdentifier, {
      config: {
        broadcast: {
          self: false,
        },
      },
    });

    // Subscribe to new messages
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${selectedChannel.id}`,
      },
      async (payload) => {
        const newMessage = payload.new as Message;

        const { data: senderData, error: senderError } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, profile_photo_url')
          .eq('id', newMessage.sender_id)
          .single();

        if (senderError) {
          console.error('Error fetching sender profile for new message:', senderError);
          return;
        }

        setMessages((prevMessages) => {
          if (prevMessages.some((msg) => msg.id === newMessage.id)) {
            return prevMessages;
          }
          return [...prevMessages, { 
            ...newMessage, 
            sender: senderData as UserProfile, 
            reads: [] 
          } as Message];
        });

        // Update channel list with new last message and increment unread count
        setChannels(prevChannels => 
          prevChannels.map(ch => 
            ch.id === newMessage.channel_id 
              ? {
                  ...ch,
                  last_message: {
                    content: newMessage.content,
                    sender_name: senderData ? 
                      `${senderData.first_name || ''} ${senderData.last_name || ''}`.trim() || 'Kullanıcı' :
                      'Kullanıcı',
                    created_at: newMessage.created_at
                  },
                  // Sadece başka birinin mesajıysa unread count'u artır
                  unread_count: newMessage.sender_id !== user.id 
                    ? (ch.unread_count || 0) + 1 
                    : ch.unread_count
                }
              : ch
          )
        );
      }
    );

    // Listen for broadcasted read receipts
    channel.on('broadcast', { event: 'message_read' }, (payload) => {
      const { reads, user: readingUser } = payload.payload;

      setMessages((prevMessages) =>
        prevMessages.map((msg) => {
          const relevantReads = reads.filter((read: MessageRead) => read.message_id === msg.id);
          if (relevantReads.length === 0) {
            return msg;
          }

          const existingReadIds = new Set(msg.reads?.map((r) => r.id));
          const newReads = relevantReads.filter((r: MessageRead) => !existingReadIds.has(r.id));

          if (newReads.length === 0) {
            return msg;
          }

          return {
            ...msg,
            reads: [...(msg.reads || []), ...newReads.map((r: MessageRead) => ({ ...r, user: readingUser }))],
          };
        })
      );
    });

    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Successfully subscribed to ${channelIdentifier}`);
      }
      if (status === 'CHANNEL_ERROR') {
        console.error(`Failed to subscribe to ${channelIdentifier}`, err);
      }
    });

    return () => {
      console.log(`Unsubscribing from ${channelIdentifier}`);
      supabase.removeChannel(channel);
    };
  }, [selectedChannel?.id, user?.id]);

  // Global realtime subscription for all channels
  useEffect(() => {
    if (!user) return;

    const globalChannel = supabase.channel('global-messages', {
      config: {
        broadcast: {
          self: false,
        },
      },
    });

    // Subscribe to all new messages to update channel list
    globalChannel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      async (payload) => {
        const newMessage = payload.new as Message;

        // Skip if this is the currently selected channel (already handled above)
        if (selectedChannel?.id === newMessage.channel_id) return;

        // Check if user is member of this channel before updating
        const { data: memberCheck } = await supabase
          .from('channel_members')
          .select('channel_id')
          .eq('user_id', user.id)
          .eq('channel_id', newMessage.channel_id)
          .single();

        // Only update if user is a member of this channel
        if (memberCheck) {
          const { data: senderData } = await supabase
            .from('user_profiles')
            .select('first_name, last_name')
            .eq('id', newMessage.sender_id)
            .single();

          // Update channel list with new last message and increment unread count
          setChannels(prevChannels => 
            prevChannels.map(ch => 
              ch.id === newMessage.channel_id 
                ? {
                    ...ch,
                    last_message: {
                      content: newMessage.content,
                      sender_name: senderData ? 
                        `${senderData.first_name || ''} ${senderData.last_name || ''}`.trim() || 'Kullanıcı' :
                        'Kullanıcı',
                      created_at: newMessage.created_at
                    },
                    // Sadece başka birinin mesajıysa unread count'u artır
                    unread_count: newMessage.sender_id !== user.id 
                      ? (ch.unread_count || 0) + 1 
                      : ch.unread_count
                  }
                : ch
            )
          );
        }
      }
    );

    globalChannel.subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, [user, selectedChannel?.id]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel || !user) return;

    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately

    try {
      // Optimistic update - add message to UI immediately
      const tempMessage = {
        id: `temp-${Date.now()}`,
        content: messageContent,
        sender_id: user.id,
        channel_id: selectedChannel.id,
        created_at: new Date().toISOString(),
        sender: userProfile
      } as Message;

      setMessages(prev => [...prev, tempMessage]);

      const { data, error } = await supabase
        .from('messages')
        .insert({
          content: messageContent,
          sender_id: user.id,
          channel_id: selectedChannel.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Replace temp message with real message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id 
            ? { ...data, sender: userProfile } as Message
            : msg
        )
      );
    } catch (error: any) {
      console.error('Error sending message:', error);
      console.error('Error details:', {
        error,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details,
        user: user?.id,
        channel: selectedChannel?.id,
        messageContent
      });
      
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => !msg.id.toString().startsWith('temp-')));
      setNewMessage(messageContent); // Restore message content
      
      // Show user-friendly error message
      alert(`Mesaj gönderilemedi: ${error?.message || 'Bilinmeyen hata'}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Giriş Yapın</h2>
          <p className="text-slate-400">Mesajları görüntülemek için giriş yapmanız gerekiyor.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-slate-900 overflow-hidden">
      {/* Channels Sidebar */}
      <div className={`w-full md:w-80 bg-slate-800/50 md:border-r border-slate-700/50 flex-col ${selectedChannel ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Mesajlar</h2>
            <button 
              onClick={() => {
                setShowCreateChannelModal(true);
                loadAllUsers();
              }}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Kanal ara..."
              className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:bg-slate-700"
            />
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => setSelectedChannel(channel)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors mb-1 ${
                  selectedChannel?.id === channel.id
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  selectedChannel?.id === channel.id
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-slate-700/50 text-slate-400'
                }`}>
                  <Hash className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium text-sm truncate">{channel.name}</div>
                  {channel.last_message ? (
                    <div className="text-xs text-slate-400 truncate">
                      <span className="font-medium">{channel.last_message.sender_name}:</span> {channel.last_message.content}
                    </div>
                  ) : channel.description ? (
                    <div className="text-xs text-slate-400 truncate">
                      {channel.description}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">
                      Henüz mesaj yok
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {channel.last_message && (
                    <div className="text-xs text-slate-500">
                      {formatTime(channel.last_message.created_at)}
                    </div>
                  )}
                  {/* Okunmamış mesaj badge'i */}
                  {(channel.unread_count || 0) > 0 && (
                    <div className="w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                      {(channel.unread_count || 0) > 99 ? '99+' : (channel.unread_count || 0)}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex-col ${selectedChannel ? 'flex' : 'hidden md:flex'}`}>
        {selectedChannel ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-700/50 bg-slate-800/30">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedChannel(null)}
                  className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors mr-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="p-2 bg-blue-500/20 text-blue-300 rounded-lg">
                  <Hash className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{selectedChannel.name}</h3>
                  {selectedChannel.description && (
                    <p className="text-sm text-slate-400">{selectedChannel.description}</p>
                  )}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowMembersModal(true);
                      setMemberSearchQuery('');
                      if (selectedChannel) {
                        loadChannelMembers(selectedChannel.id);
                        loadAllUsers();
                      }
                    }}
                    className="flex items-center gap-2 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    <span className="text-sm hidden md:inline">Üyeler</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className={`flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide ${loadingMessages ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}>
              {/* Kanal üyeliği kontrolü */}
              {!isCurrentUserMember() && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                      <X className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-red-300">Bu kanalın üyesi değilsiniz</h4>
                      <p className="text-sm text-red-400/80">
                        Bu kanala mesaj gönderemez ve yeni mesajları göremezsiniz.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Loading Skeleton */}
              {loadingMessages && (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700/50 animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-3 bg-slate-700/50 rounded w-20 animate-pulse"></div>
                          <div className="h-3 bg-slate-700/50 rounded w-12 animate-pulse"></div>
                        </div>
                        <div className="bg-slate-700/50 rounded-2xl rounded-bl-md p-3 animate-pulse">
                          <div className="h-4 bg-slate-600/50 rounded w-3/4 mb-2"></div>
                          <div className="h-4 bg-slate-600/50 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {!loadingMessages && messages.map((message, index) => {
                const showDate = index === 0 || 
                  formatDate(message.created_at) !== formatDate(messages[index - 1].created_at);
                
                const isOwnMessage = message.sender_id === user?.id;
                
                return (
                  <div 
                    key={message.id}
                    data-message-id={message.id}
                    data-sender-id={message.sender_id}
                  >
                    {showDate && (
                      <div className="flex items-center justify-center my-4">
                        <div className="bg-slate-700/50 text-slate-400 text-xs px-3 py-1 rounded-full">
                          {formatDate(message.created_at)}
                        </div>
                      </div>
                    )}
                    
                    <div className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                        {isOwnMessage ? (
                          userProfile?.profile_photo_url ? (
                            <img 
                              src={userProfile.profile_photo_url} 
                              alt={userProfile.first_name || 'Sen'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                              {userProfile?.first_name?.charAt(0) || 'S'}
                            </div>
                          )
                        ) : (
                          message.sender?.profile_photo_url ? (
                            <img 
                              src={message.sender.profile_photo_url} 
                              alt={message.sender.first_name || 'Kullanıcı'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-white text-xs font-semibold">
                              {message.sender?.first_name?.charAt(0) || 'U'}
                            </div>
                          )
                        )}
                      </div>
                      
                      {/* Message */}
                      <div className={`flex-1 max-w-md ${isOwnMessage ? 'text-right' : ''}`}>
                        <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                          <span className="font-medium text-white text-sm">
                            {isOwnMessage 
                              ? 'Sen' 
                              : `${message.sender?.first_name || ''} ${message.sender?.last_name || ''}`.trim() || 'Kullanıcı'
                            }
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatTime(message.created_at)}
                          </span>
                        </div>
                        <div className={`relative inline-block p-3 ${
                          isOwnMessage 
                            ? 'bg-blue-500 text-white rounded-2xl rounded-br-md' 
                            : 'bg-slate-700/50 text-slate-100 rounded-2xl rounded-bl-md'
                        }`}>
                          {message.content}
                          
                          {/* Message status indicators inside balloon - only show for own messages */}
                          {isOwnMessage && (
                            <div className="flex items-center justify-end gap-1 mt-1">
                              {/* Always show single tick for sent */}
                              <Check className="w-3 h-3 text-blue-200/70" />
                              
                              {/* Show small profile pictures of users who read the message */}
                              {message.reads && message.reads.length > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedMessageReads(message.reads || []);
                                    setShowReadByModal(true);
                                  }}
                                  className="flex -space-x-1 ml-1 hover:scale-105 transition-transform"
                                >
                                  {message.reads.slice(0, 4).map((read) => (
                                    <div
                                      key={read.id}
                                      className="w-3 h-3 rounded-full border border-blue-300/50 overflow-hidden"
                                    >
                                      {read.user?.profile_photo_url ? (
                                        <img 
                                          src={read.user.profile_photo_url} 
                                          alt={read.user.first_name || 'Kullanıcı'}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-white text-xs font-semibold">
                                          {read.user?.first_name?.charAt(0) || 'U'}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {message.reads.length > 4 && (
                                    <div className="w-3 h-3 rounded-full bg-blue-300/30 border border-blue-300/50 flex items-center justify-center text-xs text-blue-100">
                                      +{message.reads.length - 4}
                                    </div>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
              {isCurrentUserMember() ? (
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={`#${selectedChannel.name} kanalına mesaj yaz...`}
                      className="w-full p-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:bg-slate-700 resize-none"
                      rows={1}
                      style={{ minHeight: '44px', maxHeight: '120px' }}
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="p-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
                  <div className="text-center">
                    <X className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">
                      Bu kanala mesaj göndermek için üye olmanız gerekiyor.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Hash className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Bir kanal seçin</h3>
              <p className="text-slate-400">Mesajlaşmaya başlamak için sol taraftan bir kanal seçin.</p>
            </div>
          </div>
        )}
      </div>

      {/* Members Modal - Kapsamlı Üye Yönetimi */}
      {showMembersModal && selectedChannel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-[500px] max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Kanal Üye Yönetimi - #{selectedChannel.name}
              </h3>
              <button
                onClick={() => setShowMembersModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Üye Arama ve Ekleme */}
            {canManageMembers() && (
              <div className="mb-4 p-4 bg-slate-700/30 rounded-lg">
                <h4 className="text-sm font-medium text-slate-300 mb-3">Yeni Üye Ekle</h4>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="Kullanıcı ara..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-600/50 border border-slate-500/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                
                {memberSearchQuery && (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {allUsers
                      .filter(user => 
                        !channelMembers.some(member => member.id === user.id) &&
                        (user.first_name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                         user.last_name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                         user.position?.toLowerCase().includes(memberSearchQuery.toLowerCase()))
                      )
                      .slice(0, 5)
                      .map((user) => (
                        <button
                          key={user.id}
                          onClick={() => {
                            addMemberToChannel(user.id);
                            setMemberSearchQuery('');
                          }}
                          className="w-full flex items-center gap-3 p-2 hover:bg-slate-600/30 rounded transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-semibold">
                            {user.profile_photo_url ? (
                              <img src={user.profile_photo_url} alt="" className="w-full h-full object-cover rounded-full" />
                            ) : (
                              user.first_name?.charAt(0) || 'U'
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-sm font-medium text-white">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-xs text-slate-400">
                              {user.position || 'Çalışan'}
                            </div>
                          </div>
                          <Plus className="w-4 h-4 text-green-400" />
                        </button>
                      ))}
                    
                    {allUsers.filter(user => 
                      !channelMembers.some(member => member.id === user.id) &&
                      (user.first_name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                       user.last_name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                       user.position?.toLowerCase().includes(memberSearchQuery.toLowerCase()))
                    ).length === 0 && (
                      <div className="text-center py-2 text-slate-400 text-sm">
                        Kullanıcı bulunamadı
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Mevcut Üyeler */}
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-slate-300">
                  Kanal Üyeleri ({channelMembers.length})
                </h4>
              </div>
              
              <div className="space-y-2">
                {channelMembers.map((member) => {
                  const memberRole = member.role || 'member';
                  const isCreator = member.id === selectedChannel.created_by;
                  const isManager = memberRole === 'manager';
                  const canRemove = canManageMembers() && member.id !== user?.id && !isCreator;
                  const canToggleRole = canManageMembers() && !isCreator;

                  return (
                    <div key={member.id} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-500 flex items-center justify-center text-white font-semibold">
                        {member.profile_photo_url ? (
                          <img src={member.profile_photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          member.first_name?.charAt(0) || 'U'
                        )}
                      </div>

                      {/* Bilgiler */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">
                            {member.first_name} {member.last_name}
                          </span>
                          {isCreator && (
                            <div className="flex items-center gap-1">
                              <Crown className="w-3 h-3 text-yellow-400" />
                              <span className="text-xs text-yellow-400">Kurucu</span>
                            </div>
                          )}
                          {isManager && !isCreator && (
                            <div className="flex items-center gap-1">
                              <Shield className="w-3 h-3 text-blue-400" />
                              <span className="text-xs text-blue-400">Yönetici</span>
                            </div>
                          )}
                          {!isManager && !isCreator && (
                            <span className="text-xs text-slate-400">Üye</span>
                          )}
                        </div>
                        <div className="text-sm text-slate-400">
                          {member.position || 'Çalışan'}
                        </div>
                      </div>

                      {/* Aksiyon Butonları */}
                      <div className="flex items-center gap-1">
                        {/* Yönetici Yap/Kaldır Butonu */}
                        {canToggleRole && (
                          <button
                            onClick={() => toggleMemberRole(member.id, memberRole)}
                            className={`px-3 py-1 text-xs rounded transition-colors ${
                              isManager 
                                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' 
                                : 'bg-slate-600/50 text-slate-300 hover:bg-slate-600'
                            }`}
                            title={isManager ? 'Yöneticiliği Kaldır' : 'Yönetici Yap'}
                          >
                            {isManager ? 'Yöneticilikten Al' : 'Yönetici Yap'}
                          </button>
                        )}

                        {/* Üye Çıkar Butonu */}
                        {canRemove && (
                          <button
                            onClick={() => {
                              if (confirm(`${member.first_name} ${member.last_name} adlı kullanıcıyı kanaldan çıkarmak istediğinizden emin misiniz?`)) {
                                removeMemberFromChannel(member.id);
                              }
                            }}
                            className="px-3 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors"
                            title="Üyeyi Çıkar"
                          >
                            Çıkar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {channelMembers.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    Bu kanalda henüz üye yok
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Channel Modal */}
      {showCreateChannelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Yeni Kanal Oluştur</h3>
              <button
                onClick={() => setShowCreateChannelModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Kanal Adı
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="örn: genel-sohbet"
                  className="w-full p-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Açıklama (İsteğe bağlı)
                </label>
                <textarea
                  value={newChannelDescription}
                  onChange={(e) => setNewChannelDescription(e.target.value)}
                  placeholder="Bu kanal hakkında kısa bir açıklama..."
                  className="w-full p-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Üyeler Seç
                </label>
                <div className="max-h-40 overflow-y-auto bg-slate-700/30 rounded-lg border border-slate-600/50">
                  {allUsers.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 p-3 hover:bg-slate-600/30 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers(prev => [...prev, user.id]);
                          } else {
                            setSelectedMembers(prev => prev.filter(id => id !== user.id));
                          }
                        }}
                        className="w-4 h-4 text-blue-500 bg-slate-600 border-slate-500 rounded focus:ring-blue-500"
                      />
                      <div className="w-8 h-8 rounded-full overflow-hidden">
                        {user.profile_photo_url ? (
                          <img 
                            src={user.profile_photo_url} 
                            alt={user.first_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                            {user.first_name?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {user.position || 'Çalışan'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {selectedMembers.length > 0 && (
                  <div className="mt-2 text-xs text-slate-400">
                    {selectedMembers.length} üye seçildi
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateChannelModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={createChannel}
                  disabled={!newChannelName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Oluştur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Read By Modal */}
      {showReadByModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-96 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Mesajı Görenler ({selectedMessageReads.length})</h3>
              <button
                onClick={() => setShowReadByModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Read By List */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-3">
                {selectedMessageReads.map((read) => (
                  <div key={read.id} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                      {read.user?.profile_photo_url ? (
                        <img 
                          src={read.user.profile_photo_url} 
                          alt={read.user.first_name || 'Kullanıcı'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-white font-semibold">
                          {read.user?.first_name?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-white">
                        {read.user?.first_name} {read.user?.last_name}
                      </div>
                      <div className="text-sm text-slate-400">
                        {new Date(read.read_at).toLocaleString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })} tarihinde görüldü
                      </div>
                    </div>
                  </div>
                ))}
                
                {selectedMessageReads.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    Henüz kimse bu mesajı görmedi
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
