import fs from 'fs';
import path from 'path';
import os from 'os';
import cronParser from 'cron-parser';

const { parseExpression } = cronParser;

// OpenClaw cron job directory
export const OPENCLAW_CRON_DIR = path.join(os.homedir(), '.openclaw', 'cron');

/**
 * Read the jobs.json file containing all scheduled tasks
 */
export function readScheduledJobs() {
  const jobsFilePath = path.join(OPENCLAW_CRON_DIR, 'jobs.json');
  try {
    const content = fs.readFileSync(jobsFilePath, 'utf8');
    const data = JSON.parse(content);
    return data.jobs || [];
  } catch (error) {
    console.error('Error reading scheduled jobs:', error);
    return [];
  }
}

/**
 * Write updated jobs to the jobs.json file
 */
export function writeScheduledJobs(jobs) {
  const jobsFilePath = path.join(OPENCLAW_CRON_DIR, 'jobs.json');
  try {
    const data = {
      version: 1,
      jobs: jobs
    };
    fs.writeFileSync(jobsFilePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing scheduled jobs:', error);
    return false;
  }
}

/**
 * Get a specific job by ID
 */
export function getScheduledJob(jobId) {
  const jobs = readScheduledJobs();
  return jobs.find(job => job.id === jobId) || null;
}

/**
 * Update a job's enabled/disabled state
 */
export function updateJobState(jobId, enabled) {
  const jobs = readScheduledJobs();
  const jobIndex = jobs.findIndex(job => job.id === jobId);

  if (jobIndex === -1) {
    return { success: false, error: 'Job not found' };
  }

  const updatedJob = { ...jobs[jobIndex], enabled, updatedAtMs: Date.now() };
  jobs[jobIndex] = updatedJob;

  if (writeScheduledJobs(jobs)) {
    return { success: true, job: updatedJob };
  } else {
    return { success: false, error: 'Failed to save job' };
  }
}

/**
 * Get run history for a specific job ID from runs directory
 */
export function getJobRunHistory(jobId, limit = 20) {
  const runsDir = path.join(OPENCLAW_CRON_DIR, 'runs');
  try {
    const runFiles = fs.readdirSync(runsDir);
    const jobRuns = [];

    for (const file of runFiles) {
      if (file.endsWith('.jsonl')) {
        const runId = file.replace('.jsonl', '');
        const runFilePath = path.join(runsDir, file);

        // Read the first few lines to find the job ID in the run
        try {
          const content = fs.readFileSync(runFilePath, 'utf8');
          const lines = content.split('\n').slice(0, 10); // Read first 10 lines to find job info

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const obj = JSON.parse(line);
              // Look for job ID in various possible locations in the run file
              if (obj.jobId === jobId || (obj.payload && obj.payload.jobId === jobId)) {
                const stat = fs.statSync(runFilePath);
                jobRuns.push({
                  runId,
                  jobId,
                  createdAt: stat.birthtime.toISOString(),
                  modifiedAt: stat.mtime.toISOString(),
                  size: stat.size
                });
                break; // Found the job in this run file
              }
            } catch (e) {
              // Continue to next line if parsing fails
              continue;
            }
          }
        } catch (e) {
          // Skip files that can't be read
          continue;
        }
      }
    }

    // Sort by creation time (most recent first)
    jobRuns.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));

    return jobRuns.slice(0, limit);
  } catch (error) {
    console.error('Error reading job run history:', error);
    return [];
  }
}

/**
 * Get all scheduled jobs with additional metadata for calendar view
 */
export function getAllScheduledJobsWithMetadata() {
  const jobs = readScheduledJobs();

  return jobs.map(job => {
    // Calculate next run time based on cron expression (basic estimation)
    const now = new Date();
    let nextRunDate = null;

    if (job.state && job.state.nextRunAtMs) {
      nextRunDate = new Date(job.state.nextRunAtMs);
    }

    // Count recent runs
    const recentRuns = getJobRunHistory(job.id, 5);

    return {
      ...job,
      nextRun: nextRunDate ? nextRunDate.toISOString() : null,
      nextRunFormatted: nextRunDate ? nextRunDate.toLocaleString('zh-CN') : null,
      recentRunCount: recentRuns.length,
      lastRun: recentRuns.length > 0 ? recentRuns[0].modifiedAt : null
    };
  });
}

/**
 * Get scheduled jobs within a specific date range for calendar view
 */
/**
 * Get scheduled jobs in range with all occurrences
 */
export function getScheduledJobsInRange(startDate, endDate) {
  const allJobs = getAllScheduledJobsWithMetadata();
  const rangeStart = new Date(startDate);
  const rangeEnd = new Date(endDate);

  const result = [];

  for (const job of allJobs) {
    if (!job.schedule) continue;

    const occurrences = [];

    // Helper function to get the date portion (yyyy-MM-dd) in the job's timezone
    const getDateInTimezone = (date, tz) => {
      // Use Intl.DateTimeFormat to get the date components in the specified timezone
      const options = tz ? { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' } : { year: 'numeric', month: '2-digit', day: '2-digit' };
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(date);
      const year = parts.find(p => p.type === 'year').value;
      const month = parts.find(p => p.type === 'month').value;
      const day = parts.find(p => p.type === 'day').value;
      return `${year}-${month}-${day}`;
    };
    
    // Helper function to format datetime in the job's timezone as ISO-like string
    const formatInTimezone = (date, tz) => {
      // Get the date portion in the specified timezone
      const datePart = getDateInTimezone(date, tz);
      // Get the time portion (HH:mm:ss) in the specified timezone
      const timeOptions = tz ? { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false } : { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
      const timeFormatter = new Intl.DateTimeFormat('en-US', timeOptions);
      const timeStr = timeFormatter.format(date);
      // Return as local datetime string without 'Z' suffix to prevent timezone conversion
      // The localDate field is used for date grouping, runTime is for display only
      return `${datePart}T${timeStr}`;
    };

    // Handle cron schedule
    if (job.schedule.kind === 'cron' && job.schedule.expr) {
      try {
        const options = {
          currentDate: rangeStart,
          endDate: rangeEnd,
          ...(job.schedule.tz ? { tz: job.schedule.tz } : {})
        };
        const interval = parseExpression(job.schedule.expr, options);
        
        // Get all occurrences in range
        let current = null;
        let safety = 0;
        
        while (safety < 1000) {
          try {
            current = interval.next();
            const runDate = current.toDate();
            
            if (runDate > rangeEnd) break;
            if (runDate >= rangeStart) {
              // Format in the job's timezone so frontend displays the correct date
              occurrences.push(formatInTimezone(runDate, job.schedule.tz));
            }
          } catch (e) {
            break;
          }
          safety++;
        }
      } catch (error) {
        // Fallback to nextRun only
        if (job.nextRun) {
          const nextRun = new Date(job.nextRun);
          if (nextRun >= rangeStart && nextRun <= rangeEnd) {
            occurrences.push(formatInTimezone(nextRun, job.schedule.tz));
          }
        }
      }
    } else if (job.schedule.kind === 'every' && job.schedule.everyMs) {
      // Handle every schedule - calculate all occurrences in range
      const everyMs = job.schedule.everyMs;
      const anchorMs = job.schedule.anchorMs || rangeStart.getTime();
      
      // Start from anchor and add everyMs until we reach the range
      let currentTime = anchorMs;
      while (currentTime <= rangeEnd.getTime()) {
        if (currentTime >= rangeStart.getTime()) {
          occurrences.push(formatInTimezone(new Date(currentTime), job.schedule.tz));
        }
        currentTime += everyMs;
      }
      
      // If no occurrences found but nextRun is in range, add it
      if (occurrences.length === 0 && job.nextRun) {
        const nextRun = new Date(job.nextRun);
        if (nextRun >= rangeStart && nextRun <= rangeEnd) {
          occurrences.push(formatInTimezone(nextRun, job.schedule.tz));
        }
      }
    } else if (job.schedule.kind === 'at' && job.schedule.at) {
      // Handle "at" schedule (one-time execution)
      const atDate = new Date(job.schedule.at);
      if (atDate >= rangeStart && atDate <= rangeEnd) {
        // Format in the job's timezone
        occurrences.push(formatInTimezone(atDate, job.schedule.tz));
      }
    } else {
      // Fallback: use nextRun if available and in range
      if (job.nextRun) {
        const nextRun = new Date(job.nextRun);
        if (nextRun >= rangeStart && nextRun <= rangeEnd) {
          occurrences.push(formatInTimezone(nextRun, job.schedule.tz));
        }
      }
    }

    // Only include jobs that have at least one occurrence in the range
    if (occurrences.length > 0) {
      // Add localDate field for each occurrence (date portion in the job's timezone)
      // The occurrence string already has the date in the job's timezone from formatInTimezone,
      // so we can just extract the first 10 characters (yyyy-MM-dd) directly
      const occurrencesWithLocalDate = occurrences.map(occ => ({
        runTime: occ,
        localDate: occ.substring(0, 10) // "2026-03-17" - already in job's timezone
      }));
      
      result.push({
        ...job,
        occurrences: occurrencesWithLocalDate
      });
    }
  }

  return result;
}

/**
 * Get upcoming scheduled jobs (within the next N days)
 */
export function getUpcomingJobs(days = 30) {
  const allJobs = getAllScheduledJobsWithMetadata();
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + days);

  return allJobs.filter(job => {
    if (!job.nextRun) return false;

    const nextRun = new Date(job.nextRun);
    return nextRun >= now && nextRun <= futureDate;
  });
}

/**
 * Update a scheduled job with new data
 */
export function updateJob(jobId, newData) {
  const jobs = readScheduledJobs();
  const jobIndex = jobs.findIndex(job => job.id === jobId);

  if (jobIndex === -1) {
    return { success: false, error: 'Job not found' };
  }

  // Preserve certain immutable fields that shouldn't be changed through the API
  const preservedFields = ['id', 'createdAtMs'];

  // Create updated job object
  const updatedJob = {
    ...jobs[jobIndex],
    ...newData,
    updatedAtMs: Date.now()
  };

  // Ensure we don't overwrite protected fields
  for (const field of preservedFields) {
    if (newData.hasOwnProperty(field)) {
      updatedJob[field] = jobs[jobIndex][field];
    }
  }

  jobs[jobIndex] = updatedJob;

  if (writeScheduledJobs(jobs)) {
    return { success: true, job: updatedJob };
  } else {
    return { success: false, error: 'Failed to save job' };
  }
}