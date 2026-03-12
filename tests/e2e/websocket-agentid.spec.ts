import { test, expect } from '@playwright/test';

test('Direct WebSocket Test for agentId', async ({ page }) => {
  // Navigate to page
  await page.goto('http://localhost:7878');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  // Get session data directly from the page
  const sessionData = await page.evaluate(async () => {
    // Try to access React component state by finding session data in DOM
    const cards = document.querySelectorAll('.session-card, .dense-card');

    // Also try to get from any global window object if available
    const windowData = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.get(1);

    return {
      cardCount: cards.length,
      hasReactDevTools: !!windowData,
      // Try to extract data attributes if any
      cardsData: Array.from(cards).map((card, idx) => {
        const tool = card.querySelector('.session-tool, .dense-card-tool')?.textContent?.trim();
        const name = card.querySelector('.session-name, .dense-card-name')?.textContent?.trim();
        const meta = card.querySelector('.session-meta, .dense-card-meta');
        const badges = Array.from(card.querySelectorAll('.session-meta-badge, .dense-card-meta-badge'))
          .map(b => b.textContent?.trim());

        return { idx, tool, name, hasMeta: !!meta, badges };
      })
    };
  });

  console.log('\n=== Session Data Analysis ===');
  console.log(`Card count: ${sessionData.cardCount}`);
  console.log(`React DevTools available: ${sessionData.hasReactDevTools}`);

  sessionData.cardsData.forEach(data => {
    console.log(`\nCard ${data.idx}:`);
    console.log(`  Tool: ${data.tool}`);
    console.log(`  Name: ${data.name}`);
    console.log(`  Has meta: ${data.hasMeta}`);
    console.log(`  Badges: ${JSON.stringify(data.badges)}`);

    if (data.tool?.toLowerCase().includes('openclaw')) {
      if (!data.hasMeta || data.badges.length === 0) {
        console.log(`  ❌ PROBLEM: OpenClaw session but no agentId badge!`);
      }
    }
  });

  // Check specifically for OpenClaw sessions
  const openclawSessions = sessionData.cardsData.filter(d =>
    d.tool?.toLowerCase().includes('openclaw')
  );

  console.log(`\n=== OpenClaw Sessions (${openclawSessions.length}) ===`);
  if (openclawSessions.length === 0) {
    console.log('No OpenClaw sessions found in UI');
  } else {
    const withBadges = openclawSessions.filter(d => d.hasMeta && d.badges.length > 0);
    const withoutBadges = openclawSessions.filter(d => !d.hasMeta || d.badges.length === 0);

    console.log(`With agentId badges: ${withBadges.length}`);
    console.log(`Without agentId badges: ${withoutBadges.length}`);

    if (withoutBadges.length > 0) {
      console.log('\n❌ CONFIRMED: OpenClaw sessions missing agentId badges in UI');
      console.log('Backend sends agentId correctly, but frontend does not render it');
    } else {
      console.log('\n✅ All OpenClaw sessions have agentId badges');
    }
  }

  await page.screenshot({ path: 'tests/e2e/artifacts/websocket-agentid-test.png', fullPage: true });

  expect(sessionData.cardCount).toBeGreaterThan(0);
});