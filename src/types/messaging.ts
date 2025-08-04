export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  member_count: number;
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
  last_read_at: string;
  is_muted: boolean;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id?: string;
  content?: string;
  message_type: 'text' | 'file' | 'image' | 'video' | 'audio' | 'system';
  parent_message_id?: string;
  created_at: string;
  updated_at: string;
  edited_at?: string;
  is_deleted: boolean;
  metadata: Record<string, any>;
  
  // İlişkili veriler
  user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    profile_photo_url?: string;
  };
  user_profile?: {
    first_name: string;
    last_name?: string;
    profile_photo_url?: string;
  };
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  read_by?: MessageRead[];
  reply_count?: number;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_size?: number;
  file_type?: string;
  file_url: string;
  thumbnail_url?: string;
  created_at: string;
}

export interface MessageRead {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface UserPresence {
  user_id: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  last_seen: string;
  custom_status?: string;
  updated_at: string;
}

export interface TypingIndicator {
  channel_id: string;
  user_id: string;
  user_name: string;
  timestamp: number;
}

export interface MessageSearchResult {
  message: Message;
  channel: Channel;
  highlight: string;
}

export interface ChatState {
  channels: Channel[];
  activeChannelId?: string;
  messages: Record<string, Message[]>;
  typingUsers: Record<string, TypingIndicator[]>;
  userPresence: Record<string, UserPresence>;
  unreadCounts: Record<string, number>;
  isLoading: boolean;
  searchResults: MessageSearchResult[];
  searchQuery: string;
  messagesLoading: Record<string, boolean>;
  hasMoreMessages: Record<string, boolean>;
}

export interface SendMessageData {
  channel_id: string;
  content?: string;
  message_type?: 'text' | 'file' | 'image' | 'video' | 'audio';
  parent_message_id?: string;
  attachments?: File[];
  metadata?: Record<string, any>;
}

export interface EditMessageData {
  message_id: string;
  content: string;
}

export interface ReactionData {
  message_id: string;
  emoji: string;
}

export interface ChannelCreateData {
  name: string;
  description?: string;
  type: 'public' | 'private';
  members?: string[];
}

export interface ChannelUpdateData {
  channel_id: string;
  name?: string;
  description?: string;
}

export interface JoinChannelData {
  channel_id: string;
}

export interface LeaveChannelData {
  channel_id: string;
}

export interface MarkAsReadData {
  channel_id: string;
  message_id?: string;
}

export interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}
