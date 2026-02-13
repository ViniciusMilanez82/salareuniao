export const ROUTES = {
  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',

  // Dashboard
  DASHBOARD: '/dashboard',
  DASHBOARD_ANALYTICS: '/dashboard/analytics',

  // Meetings / Sessions
  MEETINGS: '/meetings',
  MEETING_CREATE: '/meetings/create',
  MEETING_DETAIL: (id: string) => `/meetings/${id}`,
  MEETING_ROOM: (id: string) => `/meetings/${id}/room`,

  // Agents
  AGENTS: '/agents',
  AGENT_CREATE: '/agents/create',
  AGENT_DETAIL: (id: string) => `/agents/${id}`,

  // Settings
  SETTINGS: '/settings',
  SETTINGS_PROFILE: '/settings/profile',
  SETTINGS_WORKSPACE: '/settings/workspace',
  SETTINGS_INTEGRATIONS: '/settings/integrations',
  SETTINGS_API: '/settings/api',

  // Admin
  ADMIN_DASHBOARD: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_INTEGRATIONS: '/admin/integrations',
} as const
