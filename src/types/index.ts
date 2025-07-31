export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

export interface UserProfile {
  id: string;
  personnel_number: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  address?: string;
  start_date?: string;
  end_date?: string;
  status: 'active' | 'inactive';
  gender?: 'male' | 'female' | 'other';
  birth_date?: string;
  birth_place?: string;
  national_id?: string;
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed';
  blood_type?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  profile_photo_url?: string;
  full_address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  education_level?: string;
  education_school?: string;
  education_field?: string;
  education_year?: number;
  reference_name?: string;
  reference_phone?: string;
  reference_company?: string;
  work_type: 'full_time' | 'part_time' | 'intern' | 'contract';
  salary?: number;
  iban?: string;
  bank_name?: string;
  manager_id?: string;
  is_leader: boolean;
  authority_level: 'employee' | 'team_lead' | 'manager' | 'director' | 'admin';
  created_at: string;
  updated_at: string;
  department_id?: string;
  position_id?: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Position {
  id: string;
  name: string;
  description?: string;
  department_id: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'ongoing' | 'completed' | 'cancelled';
  project_type: 'social_media' | 'software' | 'hardware' | 'rnd' | 'mobile_app' | 'website';
  client_id: string;
  start_date: string;
  end_date?: string;
  estimated_end_date: string;
  project_manager_id: string;
  project_members: string[];
  total_budget: number;
  spent_budget: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relations
  client?: {
    id: string;
    name: string;
  };
  project_manager?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  members?: UserProfile[];
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  day: string;
  time: string;
  type: 'meeting' | 'task' | 'deadline' | 'event';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  timestamp: string;
  read: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  project_id: string;
  assigned_to?: string;
  assigned_by?: string;
  informed_person?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  due_date?: string;
  completed_at?: string;
  created_by?: string;
  updated_at: string;
  // Relations
  project?: Project;
  assignee?: UserProfile;
  assigner?: UserProfile;
  informed?: UserProfile;
  creator?: UserProfile;
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
  // Multiple assignees and informed persons
  assignees?: UserProfile[];
  informed_persons?: UserProfile[];
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  assigned_at: string;
  assigned_by: string;
  // Relations
  user?: UserProfile;
  assigner?: UserProfile;
}

export interface TaskInformed {
  id: string;
  task_id: string;
  user_id: string;
  informed_at: string;
  informed_by: string;
  // Relations
  user?: UserProfile;
  informer?: UserProfile;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
  // Relations
  user?: UserProfile;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  file_type?: string;
  uploaded_by?: string;
  created_at: string;
  // Relations
  uploader?: UserProfile;
}

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  channel_id: string;
  created_at: string;
  updated_at: string;
  // Relations
  sender?: UserProfile;
  reads?: MessageRead[];
}

export interface MessageRead {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
  created_at: string;
  // Relations
  user?: UserProfile;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Relations
  members?: UserProfile[];
  lastMessage?: Message;
  creator?: UserProfile;
  managers?: UserProfile[];
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  role: 'member' | 'manager';
  joined_at: string;
  // Relations
  user?: UserProfile;
  channel?: Channel;
}
