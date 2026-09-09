export const ICONS = {
  appLogo: '/assets/icons/app-logo.png',
  home: '/assets/icons/home.png',
  healthReport: '/assets/icons/health-report.png',
  family: '/assets/icons/family.png',
  profile: '/assets/icons/profile.png',
  history: '/assets/icons/history.png',
  trend: '/assets/icons/trend.png',
  reminder: '/assets/icons/reminder.png',
  privacy: '/assets/icons/privacy.png',
  addRecord: '/assets/icons/add-record.png',
} as const

export type IconName = keyof typeof ICONS
