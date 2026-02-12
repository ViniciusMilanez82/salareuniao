export type UserRole = 'workspace_admin' | 'moderator' | 'agent_creator' | 'observer' | 'analyst' | 'integrator'
export type MeetingType = 'debate' | 'brainstorm' | 'analysis' | 'strategy' | 'review' | 'negotiation' | 'custom'
export type MeetingStatus = 'draft' | 'scheduled' | 'lobby' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'archived'
export type DealStatus = 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type Priority = 'low' | 'medium' | 'high' | 'critical'
export type Plan = 'free' | 'starter' | 'professional' | 'enterprise'

export interface Workspace {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  owner_id: string | null
  plan: Plan
  max_agents: number
  max_sessions_per_month: number
  max_members: number
  settings: Record<string, unknown>
  is_active: boolean
  trial_ends_at: string | null
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  name: string
  avatar_url: string | null
  company: string | null
  job_title: string | null
  phone: string | null
  timezone: string
  locale: string
  is_super_admin: boolean
  is_active: boolean
  email_verified_at: string | null
  two_factor_enabled: boolean
  last_active_at: string | null
  last_login_at: string | null
  login_count: number
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: UserRole
  permissions: Record<string, boolean>
  is_active: boolean
  invited_by: string | null
  joined_at: string
  last_active_at: string | null
  created_at: string
  updated_at: string
  user?: User
}

export interface Profile {
  id: string
  user_id: string
  bio: string | null
  expertise: string[]
  preferred_languages: string[]
  notification_preferences: Record<string, boolean>
  ai_assistant_preferences: Record<string, unknown>
  ui_preferences: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AIAgent {
  id: string
  workspace_id: string
  created_by: string
  name: string
  slug: string | null
  description: string | null
  avatar_url: string | null
  role: string
  expertise: string[]
  personality_traits: {
    professionalism: number
    creativity: number
    detail_orientation: number
    assertiveness: number
    empathy: number
    humor: number
  }
  system_prompt: string
  knowledge_base_summary: { domains: string[]; expertise: string[]; biases: string[] }
  voice_settings: {
    provider: string
    voice_id: string | null
    type: string
    accent: string
    speed: number
    pitch: number
  }
  visual_avatar: { style: string; expressions: boolean; background_color: string }
  behavior_settings: Record<string, unknown>
  model_settings: {
    model: string
    temperature: number
    max_tokens: number
    top_p: number
    frequency_penalty: number
    presence_penalty: number
  }
  is_active: boolean
  is_template: boolean
  is_public: boolean
  version: number
  tags: string[]
  usage_count: number
  average_rating: number
  created_at: string
  updated_at: string
}

export interface AgentKnowledge {
  id: string
  agent_id: string
  title: string
  content: string
  category: string | null
  tags: string[]
  source_type: 'upload' | 'manual' | 'api' | 'web_scrape' | 'session_learning'
  source_url: string | null
  file_path: string | null
  file_size_bytes: number | null
  mime_type: string | null
  token_count: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AgentMemory {
  id: string
  agent_id: string
  memory_type: 'session' | 'long_term' | 'episodic' | 'semantic'
  content: string
  context: string | null
  importance_score: number
  source_session_id: string | null
  related_agent_ids: string[]
  tags: string[]
  access_count: number
  last_accessed_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  workspace_id: string
  created_by: string
  email: string | null
  name: string
  company: string | null
  job_title: string | null
  phone: string | null
  avatar_url: string | null
  relationship_level: number
  tags: string[]
  notes: string | null
  is_favorite: boolean
  created_at: string
  updated_at: string
}

export interface Meeting {
  id: string
  workspace_id: string
  created_by: string
  moderator_id: string | null
  title: string
  description: string | null
  topic: string | null
  objectives: string[]
  meeting_type: MeetingType
  status: MeetingStatus
  scheduled_start: string | null
  scheduled_end: string | null
  actual_start: string | null
  actual_end: string | null
  duration_minutes: number | null
  room_id: string
  recording_url: string | null
  agenda: Array<{ title: string; duration?: number }>
  parameters: Record<string, unknown>
  settings: Record<string, boolean | string>
  summary: string | null
  key_decisions: Array<{ decision: string; context?: string }>
  tags: string[]
  template_id: string | null
  parent_session_id: string | null
  created_at: string
  updated_at: string
  // Joined
  agent_count?: number
  participant_count?: number
  creator_name?: string
  creator_avatar?: string
  agents?: MeetingAgent[]
}

export interface MeetingAgent {
  id: string
  meeting_id: string
  agent_id: string
  role_in_meeting: string
  speaking_order: number | null
  is_active: boolean
  is_muted: boolean
  configuration: Record<string, unknown>
  stats: Record<string, number>
  created_at: string
  agent?: AIAgent
}

export interface MeetingParticipant {
  id: string
  meeting_id: string
  user_id: string | null
  contact_id: string | null
  role: 'moderator' | 'observer' | 'guest'
  status: 'invited' | 'accepted' | 'declined' | 'attended' | 'no_show'
  invite_token: string | null
  joined_at: string | null
  left_at: string | null
  created_at: string
  user?: User
  contact?: Contact
}

export interface Transcript {
  id: string
  meeting_id: string
  sequence_number: number
  speaker_type: 'human' | 'ai_agent' | 'moderator' | 'system'
  speaker_id: string | null
  speaker_name: string
  content: string
  content_type: 'speech' | 'question' | 'intervention' | 'system_message' | 'action'
  audio_url: string | null
  audio_duration_seconds: number | null
  timestamp_start: string
  timestamp_end: string | null
  sentiment_score: number | null
  sentiment_label: string | null
  topics: string[]
  created_at: string
}

export interface ActionItem {
  id: string
  meeting_id: string
  workspace_id: string
  title: string
  description: string | null
  assigned_to_user: string | null
  assigned_to_name: string | null
  due_date: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'deferred'
  priority: Priority
  category: string | null
  tags: string[]
  auto_detected: boolean
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Deal {
  id: string
  workspace_id: string
  created_by: string
  title: string
  description: string | null
  value: number | null
  currency: string
  probability: number
  expected_close_date: string | null
  status: DealStatus
  priority: Priority
  tags: string[]
  related_meeting_id: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

export interface Note {
  id: string
  workspace_id: string
  user_id: string
  title: string | null
  content: string
  meeting_id: string | null
  deal_id: string | null
  agent_id: string | null
  tags: string[]
  is_pinned: boolean
  is_private: boolean
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  workspace_id: string
  created_by: string
  title: string
  description: string | null
  due_date: string | null
  status: TaskStatus
  priority: Priority
  meeting_id: string | null
  deal_id: string | null
  tags: string[]
  completed_at: string | null
  created_at: string
  updated_at: string
  assignees?: User[]
}

export interface Template {
  id: string
  workspace_id: string | null
  created_by: string
  name: string
  description: string | null
  template_type: 'agent' | 'session' | 'prompt'
  category: string | null
  icon: string | null
  config: Record<string, unknown>
  tags: string[]
  is_public: boolean
  is_official: boolean
  usage_count: number
  average_rating: number
  thumbnail_url: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  workspace_id: string | null
  type: string
  title: string
  message: string | null
  icon: string | null
  link: string | null
  entity_type: string | null
  entity_id: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  workspace_id: string | null
  user_id: string | null
  user_email: string | null
  user_name: string | null
  action: string
  entity_type: string
  entity_id: string | null
  entity_name: string | null
  changes: Record<string, { old: unknown; new: unknown }> | null
  ip_address: string | null
  severity: 'info' | 'warning' | 'error' | 'critical'
  created_at: string
}

export interface Report {
  id: string
  workspace_id: string
  created_by: string
  meeting_id: string | null
  title: string
  description: string | null
  report_type: string
  format: 'pdf' | 'docx' | 'json' | 'csv' | 'html'
  file_url: string | null
  status: 'generating' | 'ready' | 'failed' | 'expired'
  download_count: number
  created_at: string
}
