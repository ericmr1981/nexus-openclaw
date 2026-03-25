import { test, expect } from '@playwright/test';
import { NexusDashboardPage } from './pages/NexusDashboardPage';

test.describe('Sessions UX (stable sort, pin, follow tail)', () => {
  test.beforeEach(async ({ page }) => {
    // Make behavior deterministic across runs
    await page.addInitScript(() => {
      // Make stable-sort + pin behavior deterministic for this spec.
      localStorage.setItem('nexus.sessionSort', 'name');
      localStorage.setItem('nexus.pinnedAgents', JSON.stringify([]));
    });

    const dashboard = new NexusDashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForLoad();
  });

  test('top bar exposes SORT and PIN controls (defaults stable)', async ({ page }) => {
    const sortBox = page.locator('.metric-box:has(.metric-label:text-is("SORT")) .metric-value');
    await expect(sortBox).toBeVisible();
    await expect(sortBox).toHaveText(/name|activity/i);

    const pinBox = page.locator('.metric-box:has(.metric-label:text-is("PIN")) .metric-value');
    await expect(pinBox).toBeVisible();

    // Fresh storage → should default to stable sort
    await expect(sortBox).toHaveText(/name/i);
  });

  test('session cards expose FOLLOW + PIN controls (when sessions exist)', async ({ page }) => {
    const dashboard = new NexusDashboardPage(page);

    // Give websocket time to populate
    await page.waitForTimeout(3000);

    const cards = await dashboard.getSessionCards();
    const cardCount = await cards.length;

    if (cardCount === 0) {
      test.skip();
      return;
    }

    const firstCard = await dashboard.getSessionCard(0);
    await expect(firstCard).toBeVisible();

    // FOLLOW should always exist
    const followBtn = firstCard.locator('.follow-btn');
    await expect(followBtn).toBeVisible();
    await expect(followBtn).toHaveText(/FOLLOW|PAUSED|NEW/i);

    // If card has an agentId (badge), it should also expose a PIN button
    const agentBadges = firstCard.locator('.session-meta-badge, .dense-card-meta-badge');
    const hasBadges = (await agentBadges.count()) > 0;

    const pinBtn = firstCard.locator('.pin-btn');
    if (hasBadges) {
      await expect(pinBtn).toBeVisible();
      await expect(pinBtn).toHaveText(/PIN|PINNED/i);

      // Toggle pin and ensure it persists to localStorage
      const agentId = (await agentBadges.first().textContent())?.trim();
      if (agentId) {
        await pinBtn.click();
        await expect(pinBtn).toHaveText(/PINNED/i);

        const pinnedAgents = await page.evaluate(() => {
          const raw = localStorage.getItem('nexus.pinnedAgents');
          return raw ? JSON.parse(raw) : [];
        });
        expect(Array.isArray(pinnedAgents)).toBeTruthy();
        expect(pinnedAgents).toContain(agentId);
      }
    }

    // Screenshot for manual inspection in report artifacts
    await dashboard.takeScreenshot('tests/e2e/artifacts/sessions-ux.png');
  });
});
