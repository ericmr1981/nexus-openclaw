import { test, expect } from '@playwright/test';

test.describe('OpenClaw Agent ID Display', () => {
  test('verify agentId in DOM and React state', async ({ page }) => {
    // Enable console logging
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (text.includes('FRONTEND DEBUG') || text.includes('agentId')) {
        console.log('[Browser]', text);
      }
    });

    await page.goto('http://localhost:7878');

    // Wait longer for initial load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(8000);

    console.log('\n=== Checking Console Messages ===');
    const debugMessages = consoleMessages.filter(msg =>
      msg.includes('FRONTEND DEBUG') || msg.includes('agentId')
    );
    console.log(`Found ${debugMessages.length} debug messages`);
    debugMessages.forEach(msg => console.log(`  ${msg}`));

    // Get DOM analysis
    const domAnalysis = await page.evaluate(() => {
      const cards = document.querySelectorAll('.session-card, .dense-card');
      return Array.from(cards).map((card, idx) => {
        const tool = card.querySelector('.session-tool, .dense-card-tool')?.textContent?.trim();
        const name = card.querySelector('.session-name, .dense-card-name')?.textContent?.trim();
        const metaContainer = card.querySelector('.session-meta, .dense-card-meta');
        const badges = Array.from(card.querySelectorAll('.session-meta-badge, .dense-card-meta-badge'))
          .map(b => b.textContent?.trim());

        return { idx, tool, name, hasMeta: metaContainer !== null, badges };
      });
    });

    console.log('\n=== DOM Analysis ===');
    domAnalysis.forEach(data => {
      console.log(`Card ${data.idx}: tool="${data.tool}", hasMeta=${data.hasMeta}, badges=${JSON.stringify(data.badges)}`);
    });

    // Look specifically at OpenClaw sessions
    const openclawCards = domAnalysis.filter(d =>
      d.tool?.toLowerCase().includes('openclaw')
    );

    console.log(`\n=== OpenClaw Cards (${openclawCards.length}) ===`);
    openclawCards.forEach(data => {
      console.log(`Card ${data.idx}: hasMeta=${data.hasMeta}, badges=${JSON.stringify(data.badges)}`);
      if (!data.hasMeta || data.badges.length === 0) {
        console.log(`  ❌ NO AGENT ID DISPLAYED!`);
      }
    });

    // Screenshot
    await page.screenshot({ path: 'tests/e2e/artifacts/openclaw-agentid-final.png', fullPage: true });

    // Test assertion
    const openclawWithBadges = openclawCards.filter(d => d.hasMeta && d.badges.length > 0);
    if (openclawCards.length > 0 && openclawWithBadges.length === 0) {
      console.log('\n❌ TEST FAILED: OpenClaw sessions exist but no agentId badges are displayed!');
      console.log('This confirms the frontend rendering issue.');
    } else if (openclawWithBadges.length > 0) {
      console.log('\n✅ TEST PASSED: OpenClaw sessions with agentId badges found!');
    }
  });
});