/**
 * API Endpoints for Scheduled Tasks Calendar Feature
 *
 * These endpoints integrate with OpenClaw's cron job system located at:
 * - Jobs: ~/.openclaw/cron/jobs.json
 * - Runs: ~/.openclaw/cron/runs/
 */

/**
 * GET /api/scheduled-tasks
 * Retrieves all scheduled tasks with metadata for calendar display
 *
 * Response:
 * {
 *   tasks: [
 *     {
 *       id: string,
 *       agentId: string,
 *       sessionKey: string,
 *       name: string,
 *       enabled: boolean,
 *       createdAtMs: number,
 *       updatedAtMs: number,
 *       schedule: {
 *         kind: "cron",
 *         expr: string,
 *         tz: string
 *       },
 *       sessionTarget: string,
 *       wakeMode: string,
 *       payload: object,
 *       delivery: object,
 *       state: object,
 *       nextRun: string|null, // ISO date string
 *       nextRunFormatted: string|null, // Localized date string
 *       recentRunCount: number,
 *       lastRun: string|null // ISO date string
 *     }
 *   ]
 * }
 */

/**
 * GET /api/scheduled-tasks/upcoming
 * Retrieves scheduled tasks occurring within a specified number of days
 *
 * Query params:
 * - days (optional, default: 30) - number of days to look ahead
 *
 * Response:
 * {
 *   tasks: [ /* same as above */ ]
 * }
 */

/**
 * GET /api/scheduled-tasks/calendar-range
 * Retrieves scheduled tasks within a specific date range for calendar views
 *
 * Query params:
 * - startDate (required) - start date in ISO format
 * - endDate (required) - end date in ISO format
 *
 * Response:
 * {
 *   tasks: [ /* same as above */ ]
 * }
 */

/**
 * GET /api/scheduled-tasks/:jobId
 * Retrieves detailed information for a specific scheduled task
 *
 * Path params:
 * - jobId (required) - the unique ID of the scheduled task
 *
 * Response:
 * {
 *   task: { /* single task object */ }
 * }
 */

/**
 * GET /api/scheduled-tasks/:jobId/history
 * Retrieves execution history for a specific scheduled task
 *
 * Path params:
 * - jobId (required) - the unique ID of the scheduled task
 *
 * Query params:
 * - limit (optional, default: 20) - maximum number of history entries to return
 *
 * Response:
 * {
 *   history: [
 *     {
 *       runId: string,
 *       jobId: string,
 *       createdAt: string, // ISO date string
 *       modifiedAt: string, // ISO date string
 *       size: number // file size in bytes
 *     }
 *   ]
 * }
 */

/**
 * PATCH /api/scheduled-tasks/:jobId/state
 * Updates the enabled/disabled state of a scheduled task
 *
 * Path params:
 * - jobId (required) - the unique ID of the scheduled task
 *
 * Request body:
 * {
 *   enabled: boolean
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   task: { /* updated task object */ }
 * }
 */