import { test } from '@playwright/test';

test('Debug timezone issue with task dates', async ({ page }) => {
  // Navigate to scheduled tasks
  await page.goto('http://localhost:7878/scheduled-tasks');
  await page.waitForTimeout(1000);

  // Get API response
  const response = await page.evaluate(async () => {
    const res = await fetch('/api/scheduled-tasks/calendar-range', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
    });
    return res.json();
  });

  console.log('\n=== Timezone Debug ===');
  console.log('Current browser timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
  console.log('Current browser time:', new Date().toString());

  // Analyze each task
  response.tasks.forEach((task: any) => {
    console.log('\n--- Task:', task.name);
    console.log('nextRun (ISO/UTC):', task.nextRun);
    console.log('nextRunFormatted (server):', task.nextRunFormatted);

    // Parse in browser
    const parsedDate = new Date(task.nextRun);
    console.log('Parsed in browser:', parsedDate.toString());
    console.log('Parsed in browser (local):', parsedDate.toLocaleString());
    console.log('Parsed in browser (date only):', parsedDate.toLocaleDateString());

    // Check if nextRunAtMs exists
    if (task.state?.nextRunAtMs) {
      const fromMs = new Date(task.state.nextRunAtMs);
      console.log('From nextRunAtMs:', fromMs.toString());
    }
  });

  // Check today's date on calendar
  const todayCell = await page.locator('.calendar-day.today').first();
  const todayDate = await todayCell.locator('.calendar-day-header').first().textContent();
  console.log('\n=== Calendar Today ===');
  console.log('Today cell shows date:', todayDate);

  // Check tasks in today cell
  const todayTasks = await todayCell.locator('.calendar-task').count();
  console.log('Tasks in today cell:', todayTasks);

  // Get task names in today cell
  if (todayTasks > 0) {
    const taskNames = await todayCell.locator('.calendar-task').allTextContents();
    console.log('Task names in today cell:', taskNames);
  }
});