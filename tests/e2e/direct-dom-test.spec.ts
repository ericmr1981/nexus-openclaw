import { test, expect } from '@playwright/test';

test('Direct test: Check session object in browser', async ({ page }) => {
  // Navigate to the dashboard
  await page.goto('http://localhost:7878');

  // Wait for page to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  // Execute JavaScript to inspect the actual session data
  const sessionData = await page.evaluate(() => {
    // Find all session cards in the DOM
    const cards = document.querySelectorAll('.session-card, .dense-card');

    return Array.from(cards).map((card, idx) => {
      const toolEl = card.querySelector('.session-tool, .dense-card-tool');
      const nameEl = card.querySelector('.session-name, .dense-card-name');
      const metaContainer = card.querySelector('.session-meta, .dense-card-meta');
      const badges = card.querySelectorAll('.session-meta-badge, .dense-card-meta-badge');

      return {
        index: idx,
        tool: toolEl?.textContent?.trim() || null,
        name: nameEl?.textContent?.trim() || null,
        hasMetaContainer: metaContainer !== null,
        badgeCount: badges.length,
        badges: Array.from(badges).map(b => b.textContent?.trim()),
        // Also check the React props by looking at data attributes if available
        cardClasses: card.className
      };
    });
  });

  console.log('\n=== DOM Analysis ===');
  sessionData.forEach(data => {
    console.log(`\nCard ${data.index}:`);
    console.log(`  Tool: ${data.tool}`);
    console.log(`  Name: ${data.name}`);
    console.log(`  Has meta container: ${data.hasMetaContainer}`);
    console.log(`  Badge count: ${data.badgeCount}`);
    console.log(`  Badges: ${JSON.stringify(data.badges)}`);
    console.log(`  Classes: ${data.cardClasses}`);
  });

  // Look for OpenClaw sessions
  const openclawSessions = sessionData.filter(d =>
    d.tool?.toLowerCase().includes('openclaw')
  );

  console.log(`\n=== OpenClaw Sessions (${openclawSessions.length}) ===`);
  openclawSessions.forEach(data => {
    console.log(`\nCard ${data.index}:`);
    console.log(`  Has meta container: ${data.hasMetaContainer}`);
    console.log(`  Badge count: ${data.badgeCount}`);
    console.log(`  Badges: ${JSON.stringify(data.badges)}`);
    if (data.badgeCount === 0) {
      console.log(`  ⚠️  NO BADGES DISPLAYED - This is the problem!`);
    }
  });

  // Take screenshot
  await page.screenshot({ path: 'tests/e2e/artifacts/direct-dom-analysis.png', fullPage: true });

  expect(sessionData.length).toBeGreaterThan(0);
});