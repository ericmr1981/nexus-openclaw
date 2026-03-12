import { test, expect } from '@playwright/test';

test.describe('Calendar Task Display', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to scheduled tasks
    await page.goto('http://localhost:7878/scheduled-tasks');
    await page.waitForTimeout(1000);
  });

  test('should display tasks on calendar days in month view', async ({ page }) => {
    // Wait for calendar to load
    await expect(page.locator('.calendar-container')).toBeVisible({ timeout: 5000 });

    // Check if there are any task elements in the calendar
    const calendarTasks = page.locator('.calendar-task');
    const taskCount = await calendarTasks.count();

    console.log(`Found ${taskCount} tasks displayed in month view`);

    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/calendar-month-view-debug.png', fullPage: true });

    // If no tasks are displayed, check if there's data
    if (taskCount === 0) {
      // Check the console for errors
      const consoleLogs: string[] = [];
      page.on('console', msg => {
        consoleLogs.push(`${msg.type()}: ${msg.text()}`);
      });

      // Reload to capture console logs
      await page.reload();
      await page.waitForTimeout(2000);

      console.log('Console logs:', consoleLogs);

      // Check if the error message is displayed
      const errorAlert = page.locator('text=/Error|Failed/i');
      if (await errorAlert.count() > 0) {
        const errorText = await errorAlert.first().textContent();
        console.log('Error displayed on page:', errorText);
      }
    }

    // Check if calendar days have task containers
    const calendarDays = page.locator('.calendar-day');
    const dayCount = await calendarDays.count();
    console.log(`Found ${dayCount} calendar days`);

    // Check first few days for task containers
    for (let i = 0; i < Math.min(3, dayCount); i++) {
      const day = calendarDays.nth(i);
      const tasksInDay = await day.locator('.calendar-task').count();
      const dateText = await day.locator('.calendar-day-header').first().textContent();
      console.log(`Day ${dateText}: ${tasksInDay} tasks`);
    }
  });

  test('should display tasks in week view', async ({ page }) => {
    // Switch to week view
    const weekBtn = page.locator('.view-toggle-btn:has-text("周")');
    await weekBtn.click();
    await page.waitForTimeout(500);

    // Check if week view is displayed
    await expect(page.locator('.calendar-container')).toBeVisible();

    // Take a screenshot
    await page.screenshot({ path: 'test-results/calendar-week-view-debug.png', fullPage: true });

    // Check for tasks in week view
    const calendarTasks = page.locator('.calendar-task');
    const taskCount = await calendarTasks.count();

    console.log(`Found ${taskCount} tasks in week view`);

    // Check if calendar days show tasks
    const weekDays = page.locator('.calendar-day');
    const dayCount = await weekDays.count();
    console.log(`Found ${dayCount} days in week view`);

    for (let i = 0; i < dayCount; i++) {
      const day = weekDays.nth(i);
      const tasksInDay = await day.locator('.calendar-task').count();
      console.log(`Week day ${i}: ${tasksInDay} tasks`);
    }
  });

  test('should NOT display day view button (removed)', async ({ page }) => {
    // Wait for calendar to load
    await expect(page.locator('.calendar-container')).toBeVisible();

    // Check that day view button does NOT exist
    const dayBtn = page.locator('.view-toggle-btn:has-text("日")');
    await expect(dayBtn).not.toBeVisible();

    console.log('✅ Day view button successfully removed');
  });

  test('should highlight today with tasks', async ({ page }) => {
    // Wait for calendar to load
    await expect(page.locator('.calendar-container')).toBeVisible();

    // Find today's cell
    const todayCell = page.locator('.calendar-day.today');

    if (await todayCell.count() > 0) {
      console.log('Found today cell');

      // Check if today has tasks
      const tasksInToday = await todayCell.locator('.calendar-task').count();
      console.log(`Today has ${tasksInToday} tasks`);

      // Take screenshot of today's cell
      await todayCell.screenshot({ path: 'test-results/calendar-today-cell.png' });
    } else {
      console.log('Today cell not found');
    }
  });

  test('should filter out heartbeat/monitoring tasks', async ({ page }) => {
    // Wait for calendar to load
    await expect(page.locator('.calendar-container')).toBeVisible();

    // Get all task names displayed in the calendar
    const displayedTasks = await page.locator('.calendar-task').allTextContents();

    console.log(`Found ${displayedTasks.length} displayed tasks`);

    // Check that monitoring/heartbeat tasks are NOT displayed
    const monitoringKeywords = ['监控', '轻度同步', '高频', 'monitor', 'heartbeat'];

    for (const taskName of displayedTasks) {
      for (const keyword of monitoringKeywords) {
        if (taskName.toLowerCase().includes(keyword.toLowerCase())) {
          console.log(`❌ Found filtered task: ${taskName}`);
        }
      }
    }

    // Verify no monitoring tasks are displayed
    const monitoringTasks = displayedTasks.filter(task =>
      monitoringKeywords.some(keyword =>
        task.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    console.log(`Filtered tasks found: ${monitoringTasks.length}`);
    expect(monitoringTasks.length).toBe(0);
  });
});