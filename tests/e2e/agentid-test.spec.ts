import { test, expect } from '@playwright/test';

test('OpenClaw Agent ID Display Verification', async ({ page }) => {
  await page.goto('http://localhost:7878');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

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

  console.log('\n=== Session Cards ===');
  domAnalysis.forEach(data => {
    console.log(`Card ${data.idx}: tool="${data.tool}", hasMeta=${data.hasMeta}, badges=${JSON.stringify(data.badges)}`);
  });

  const openclawCards = domAnalysis.filter(d => d.tool?.toLowerCase().includes('openclaw'));
  console.log(`\n=== OpenClaw Sessions (${openclawCards.length}) ===`);

  if (openclawCards.length > 0) {
    const hasBadges = openclawCards.some(d => d.hasMeta && d.badges.length > 0);
    if (hasBadges) {
      console.log('✅ OpenClaw sessions have agentId badges');
    } else {
      console.log('❌ OpenClaw sessions found but NO agentId badges displayed!');
      console.log('This is the problem we need to fix.');
    }
  }

  await page.screenshot({ path: 'tests/e2e/artifacts/agentid-verification.png', fullPage: true });
});