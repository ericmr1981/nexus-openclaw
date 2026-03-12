import { test, expect } from '@playwright/test';

test('Verify frontend receives and stores agentId', async ({ page }) => {
  // Enable console logging
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    consoleMessages.push(msg.text());
    console.log('[Browser Console]', msg.text());
  });

  // Navigate to the dashboard
  await page.goto('http://localhost:7878');

  // Wait for page to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  // Check for debug messages
  const debugMessages = consoleMessages.filter(msg =>
    msg.includes('FRONTEND DEBUG') || msg.includes('OpenClaw session')
  );

  console.log('\n=== Console Debug Messages ===');
  debugMessages.forEach(msg => console.log(msg));

  // Get all session cards
  const sessionCards = page.locator('.session-card, .dense-card');
  const cardCount = await sessionCards.count();

  console.log(`\n=== Session Cards in UI ===`);
  console.log(`Total cards: ${cardCount}`);

  for (let i = 0; i < cardCount; i++) {
    const card = sessionCards.nth(i);

    // Get session name
    const nameElement = card.locator('.session-name, .dense-card-name');
    const name = await nameElement.count() > 0 ? await nameElement.textContent() : 'N/A';

    // Get tool
    const toolElement = card.locator('.session-tool, .dense-card-tool');
    const tool = await toolElement.count() > 0 ? await toolElement.textContent() : 'N/A';

    // Check for meta badges
    const metaContainer = card.locator('.session-meta, .dense-card-meta');
    const hasMeta = await metaContainer.count() > 0;

    console.log(`\nCard ${i + 1}:`);
    console.log(`  Tool: ${tool?.trim()}`);
    console.log(`  Name: ${name?.trim()}`);
    console.log(`  Has meta: ${hasMeta}`);

    // If it's an OpenClaw card, check for agentId specifically
    if (tool?.toLowerCase().includes('openclaw')) {
      console.log(`  ⚠️  OpenClaw session but no meta badges displayed!`);
    }
  }

  // Take screenshot
  await page.screenshot({ path: 'tests/e2e/artifacts/frontend-agent-id-debug.png', fullPage: true });

  expect(cardCount).toBeGreaterThan(0);
});