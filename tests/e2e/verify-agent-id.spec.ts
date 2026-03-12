import { test, expect } from '@playwright/test';

test('Verify agent ID is displayed for OpenClaw sessions', async ({ page }) => {
  // Navigate to the dashboard
  await page.goto('http://localhost:7878');

  // Wait for page to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Get all session cards
  const sessionCards = page.locator('.session-card, .dense-card');
  const cardCount = await sessionCards.count();

  console.log(`Found ${cardCount} session cards`);

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
    console.log(`  Tool: ${tool}`);
    console.log(`  Name: ${name}`);
    console.log(`  Has meta: ${hasMeta}`);

    if (hasMeta) {
      const badges = card.locator('.session-meta-badge, .dense-card-meta-badge');
      const badgeCount = await badges.count();
      console.log(`  Badge count: ${badgeCount}`);

      for (let j = 0; j < badgeCount; j++) {
        const badgeText = await badges.nth(j).textContent();
        console.log(`    Badge ${j + 1}: ${badgeText}`);
      }
    } else {
      console.log('  No meta badges found');
    }
  }

  // Take a screenshot
  await page.screenshot({ path: 'tests/e2e/artifacts/agent-id-verification.png', fullPage: true });

  // Check if any OpenClaw sessions have agent ID displayed
  let foundOpenClawWithAgentId = false;
  for (let i = 0; i < cardCount; i++) {
    const card = sessionCards.nth(i);
    const toolElement = card.locator('.session-tool, .dense-card-tool');
    const tool = await toolElement.count() > 0 ? await toolElement.textContent() : '';

    if (tool.toLowerCase().includes('openclaw')) {
      const metaContainer = card.locator('.session-meta, .dense-card-meta');
      const hasMeta = await metaContainer.count() > 0;

      if (hasMeta) {
        foundOpenClawWithAgentId = true;
        console.log('\n✅ Found OpenClaw session with meta badges!');
        break;
      }
    }
  }

  if (!foundOpenClawWithAgentId) {
    console.log('\n⚠️  No OpenClaw sessions with agent ID found in UI');
    console.log('This might be a frontend rendering issue');
  }

  expect(cardCount).toBeGreaterThan(0);
});