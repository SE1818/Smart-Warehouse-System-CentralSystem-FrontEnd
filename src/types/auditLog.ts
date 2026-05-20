export interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  activityType: ActivityType;
  entityType?: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  severity: LogSeverity;
  message?: string;
  createdAt: string;
}

export const ActivityType = {
  Login: 'Login',
  Logout: 'Logout',
  Create: 'Create',
  Update: 'Update',
  Delete: 'Delete',
  View: 'View',
  Export: 'Export',
  Import: 'Import',
} as const;

export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

export const LogSeverity = {
  Info: 'Info',
  Warning: 'Warning',
  Error: 'Error',
  Critical: 'Critical',
} as const;

export type LogSeverity = (typeof LogSeverity)[keyof typeof LogSeverity];

export interface AuditLogFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  entityType?: string;
  activityType?: ActivityType;
  severity?: LogSeverity;
  search?: string;
  page?: number;
  limit?: number;
}