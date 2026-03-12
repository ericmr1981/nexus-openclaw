/**
 * Data Models for Scheduled Tasks Calendar Feature
 */

/**
 * Represents a scheduled task/job from OpenClaw cron system
 */
export interface ScheduledTask {
  id: string;
  agentId: string;
  sessionKey: string;
  name: string;
  enabled: boolean;
  createdAtMs: number;
  updatedAtMs: number;
  schedule: {
    kind: string; // Usually "cron", "at", or "every"
    expr?: string; // Cron expression like "30 2 1 * *" (for cron kind)
    tz: string;   // Timezone like "Asia/Shanghai"
    at?: string; // ISO timestamp (for at kind)
    everyMs?: number; // Interval in milliseconds (for every kind)
    anchorMs?: number; // Anchor time in milliseconds (for every kind)
  };
  sessionTarget: string;
  wakeMode: string;
  payload: any; // Contains the actual task definition
  delivery: {
    mode: string;
    to: string;
    channel: string;
  };
  state: {
    nextRunAtMs?: number; // Timestamp of next scheduled run
  };
  // Additional computed/calculated fields for UI
  nextRun?: string | null; // Formatted next run date (ISO string)
  nextRunFormatted?: string | null; // Human-readable next run date
  recentRunCount?: number; // Count of recent executions
  lastRun?: string | null; // Date of last execution
}

/**
 * Represents execution history for a scheduled task
 */
export interface TaskExecutionHistory {
  runId: string;
  jobId: string;
  createdAt: string;  // ISO date string
  modifiedAt: string; // ISO date string
  size: number;       // File size in bytes
}

/**
 * Request/Response DTOs for API endpoints
 */

export interface GetScheduledTasksResponse {
  tasks: ScheduledTask[];
}

export interface GetUpcomingTasksRequest {
  days?: number; // Default: 30
}

export interface GetCalendarRangeRequest {
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
}

export interface GetTaskByIdResponse {
  task: ScheduledTask;
}

export interface GetTaskHistoryRequest {
  limit?: number; // Default: 20
}

export interface GetTaskHistoryResponse {
  history: TaskExecutionHistory[];
}

export interface UpdateTaskStateRequest {
  enabled: boolean;
}

export interface UpdateTaskStateResponse {
  success: boolean;
  task: ScheduledTask;
}

/**
 * Calendar-specific data structures
 */

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  extendedProps?: {
    taskId: string;
    task: ScheduledTask;
  };
}

export interface CalendarViewOptions {
  view: 'day' | 'week' | 'month';
  date: Date;
}