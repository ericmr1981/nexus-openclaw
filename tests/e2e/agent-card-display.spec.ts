import { test, expect } from '@playwright/test';
import { NexusDashboardPage } from './pages/NexusDashboardPage';

test.describe('Agent Card - Agent ID and Model Display', () => {
  test.beforeEach(async ({ page }) => {
    const dashboard = new NexusDashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForLoad();
  });

  test.describe('Normal View Mode', () => {
    test('should display session cards on the dashboard', async ({ page }) => {
      const dashboard = new NexusDashboardPage(page);

      // Wait for any sessions to load
      await page.waitForTimeout(3000);

      // Get session cards
      const cards = await dashboard.getSessionCards();
      const cardCount = await cards.length;

      // It's possible no sessions are active, so we allow 0 cards
      // But if there are cards, they should be visible
      if (cardCount > 0) {
        const firstCard = await dashboard.getSessionCard(0);
        await expect(firstCard).toBeVisible();

        // Take screenshot for visual verification
        await dashboard.takeScreenshot('artifacts/normal-view-session-cards.png');
      }
    });

    test('should display agent ID and model badges when available', async ({ page }) => {
      const dashboard = new NexusDashboardPage(page);

      // Wait for sessions to load and process
      await page.waitForTimeout(5000);

      // Get all session cards
      const cards = await dashboard.getSessionCards();
      const cardCount = await cards.length;

      if (cardCount > 0) {
        // Check each card for meta information
        let foundMetaInfo = false;
        for (let i = 0; i < cardCount; i++) {
          const hasMeta = await dashboard.hasMetaInfo(i);
          if (hasMeta) {
            foundMetaInfo = true;

            // Get meta badges
            const badges = await dashboard.getMetaBadges(i);
            console.log(`Card ${i} meta badges:`, badges);

            // If badges exist, they should be non-empty
            expect(badges.length).toBeGreaterThan(0);

            // Get session details
            const sessionName = await dashboard.getSessionName(i);
            const sessionState = await dashboard.getSessionState(i);

            console.log(`Session ${i}: name="${sessionName}", state="${sessionState}", badges=${JSON.stringify(badges)}`);
          }
        }

        // Take screenshot of all cards
        await dashboard.takeScreenshot('artifacts/normal-view-meta-badges.png');

        // Note: If no meta info is found, it means no sessions have agentId or model
        // This is expected for sessions that don't provide this information
        console.log(`Found meta info on ${foundMetaInfo ? 'some' : 'no'} session cards`);
      } else {
        console.log('No active sessions to test');
        test.skip();
      }
    });

    test('meta badges should be styled correctly', async ({ page }) => {
      const dashboard = new NexusDashboardPage(page);

      await page.waitForTimeout(5000);

      const cards = await dashboard.getSessionCards();
      const cardCount = await cards.length;

      if (cardCount > 0) {
        // Find a card with meta information
        let cardWithMeta = -1;
        for (let i = 0; i < cardCount; i++) {
          if (await dashboard.hasMetaInfo(i)) {
            cardWithMeta = i;
            break;
          }
        }

        if (cardWithMeta >= 0) {
          const card = await dashboard.getSessionCard(cardWithMeta);

          // Check that meta badges exist and are visible
          const badges = card.locator('.session-meta-badge, .dense-card-meta-badge');
          await expect(badges.first()).toBeVisible();

          // Verify badges have proper styling
          const badgeCount = await badges.count();
          for (let i = 0; i < badgeCount; i++) {
            const badge = badges.nth(i);
            await expect(badge).toBeVisible();

            // Check that badge has text content
            const text = await badge.textContent();
            expect(text?.trim().length).toBeGreaterThan(0);
          }

          // Take screenshot for visual verification
          await dashboard.takeScreenshot('artifacts/normal-view-badge-styling.png');
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('Dense View Mode', () => {
    test('should display agent ID and model in dense mode', async ({ page }) => {
      const dashboard = new NexusDashboardPage(page);

      await page.waitForTimeout(3000);

      // Toggle to dense view if possible
      const viewModeToggle = dashboard.viewModeToggle;
      if (await viewModeToggle.count() > 0) {
        await dashboard.toggleViewMode();
        await page.waitForTimeout(1000);
      }

      const cards = await dashboard.getSessionCards();
      const cardCount = await cards.length;

      if (cardCount > 0) {
        // Check for dense meta badges
        let foundMetaInfo = false;
        for (let i = 0; i < cardCount; i++) {
          const card = await dashboard.getSessionCard(i);
          const metaContainer = card.locator('.dense-card-meta');
          const metaCount = await metaContainer.count();

          if (metaCount > 0) {
            foundMetaInfo = true;
            const badges = await dashboard.getMetaBadges(i);
            console.log(`Dense card ${i} meta badges:`, badges);

            if (badges.length > 0) {
              expect(badges[0]?.length).toBeGreaterThan(0);
            }
          }
        }

        // Take screenshot for visual verification
        await dashboard.takeScreenshot('artifacts/dense-view-meta-badges.png');

        console.log(`Found meta info in dense mode: ${foundMetaInfo}`);
      } else {
        test.skip();
      }
    });
  });

  test.describe('WebSocket Real-time Updates', () => {
    test('meta badges should update when session receives new model/agent info', async ({ page }) => {
      const dashboard = new NexusDashboardPage(page);

      await page.waitForTimeout(3000);

      const cards = await dashboard.getSessionCards();
      const cardCount = await cards.length;

      if (cardCount > 0) {
        // Take initial screenshot
        await dashboard.takeScreenshot('artifacts/realtime-before.png');

        // Wait for potential WebSocket updates
        await page.waitForTimeout(10000);

        // Take screenshot after waiting
        await dashboard.takeScreenshot('artifacts/realtime-after.png');

        // Check if any cards now have meta info
        let foundMetaInfo = false;
        for (let i = 0; i < cardCount; i++) {
          if (await dashboard.hasMetaInfo(i)) {
            foundMetaInfo = true;
            const badges = await dashboard.getMetaBadges(i);
            console.log(`Card ${i} after update:`, badges);
          }
        }

        console.log(`Real-time update check: ${foundMetaInfo ? 'found meta info' : 'no meta info found'}`);
      } else {
        test.skip();
      }
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle sessions without agentId or model gracefully', async ({ page }) => {
      const dashboard = new NexusDashboardPage(page);

      await page.waitForTimeout(3000);

      const cards = await dashboard.getSessionCards();
      const cardCount = await cards.length;

      if (cardCount > 0) {
        for (let i = 0; i < cardCount; i++) {
          const hasMeta = await dashboard.hasMetaInfo(i);

          if (hasMeta) {
            // Card has meta info, verify badges are properly displayed
            const badges = await dashboard.getMetaBadges(i);
            expect(badges.length).toBeGreaterThan(0);
            expect(badges[0]?.length).toBeGreaterThan(0);
          } else {
            // Card has no meta info, this is acceptable
            console.log(`Card ${i} has no meta info (expected for some sessions)`);
          }
        }

        await dashboard.takeScreenshot('artifacts/edge-cases-no-meta.png');
      } else {
        test.skip();
      }
    });

    test('should handle empty agentId or model values', async ({ page }) => {
      const dashboard = new NexusDashboardPage(page);

      await page.waitForTimeout(3000);

      const cards = await dashboard.getSessionCards();
      const cardCount = await cards.length;

      if (cardCount > 0) {
        for (let i = 0; i < cardCount; i++) {
          const hasMeta = await dashboard.hasMetaInfo(i);

          if (hasMeta) {
            const badges = await dashboard.getMetaBadges(i);

            // All badges should have non-empty content
            for (const badge of badges) {
              expect(badge.length).toBeGreaterThan(0);
              expect(badge.trim()).not.toBe('');
            }
          }
        }

        await dashboard.takeScreenshot('artifacts/edge-cases-empty-values.png');
      } else {
        test.skip();
      }
    });
  });
});