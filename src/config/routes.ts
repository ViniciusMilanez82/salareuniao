export const ROUTES = {
  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_2FA: '/verify-2fa',

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
  AGENT_STUDIO: (id: string) => `/agents/${id}/studio`,

  // Sessions Archive
  SESSIONS_ARCHIVE: '/sessions/archive',

  // Contacts
  CONTACTS: '/contacts',

  // Deals
  DEALS: '/deals',
  DEALS_PIPELINE: '/deals/pipeline',
  DEAL_DETAIL: (id: string) => `/deals/${id}`,

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
  ADMIN_AUDIT: '/admin/audit',
  ADMIN_BILLING: '/admin/billing',
} as const
