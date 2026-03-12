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

    // Handle cron schedule
    if (job.schedule.kind === 'cron' && job.schedule.expr) {
      try {
        const options = job.schedule.tz ? { tz: job.schedule.tz } : {};
        const interval = parseExpression(job.schedule.expr, options);
        
        // Get all occurrences in range
        const occurrences = [];
        let current = null;
        let safety = 0;
        
        while (safety < 1000) {
          try {
            current = interval.next();
            const runDate = current.toDate();
            
            if (runDate > rangeEnd) break;
            if (runDate >= rangeStart) {
              occurrences.push(runDate.toISOString());
            }
          } catch (e) {
            break;
          }
          safety++;
        }

        if (occurrences.length > 0) {
          result.push({
            ...job,
            occurrences
          });
        }
      } catch (error) {
        // Fallback to nextRun only
        if (job.nextRun) {
          const nextRun = new Date(job.nextRun);
          if (nextRun >= rangeStart && nextRun <= rangeEnd) {
            result.push({ ...job, occurrences: [job.nextRun] });
          }
        }
      }
    } else if (job.schedule.kind === 'every' && job.nextRun) {
      // Handle every schedule
      const nextRun = new Date(job.nextRun);
      if (nextRun >= rangeStart && nextRun <= rangeEnd) {
        result.push({ ...job, occurrences: [job.nextRun] });
      }
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