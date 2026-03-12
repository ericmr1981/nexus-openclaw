import { Page } from '@playwright/test';

/**
 * Page Object Model for Nexus Dashboard
 * Represents the main application page where agent sessions are displayed
 */
export class NexusDashboardPage {
  readonly page: Page;
  readonly sessionCards;
  readonly connectionStatus;
  readonly viewModeToggle;
  readonly toolEventsToggle;

  constructor(page: Page) {
    this.page = page;
    this.sessionCards = page.locator('.session-card, .dense-card');
    this.connectionStatus = page.locator('[data-testid="connection-status"], .connection-status');
    this.viewModeToggle = page.locator('[data-testid="view-mode-toggle"], button:has-text("View")');
    this.toolEventsToggle = page.locator('[data-testid="tool-events-toggle"], input[type="checkbox"]');
  }

  /**
   * Navigate to the Nexus dashboard
   */
  async goto() {
    await this.page.goto('/');
  }

  /**
   * Wait for page to be fully loaded and connected
   */
  async waitForLoad() {
    // Wait for connection to establish
    await this.page.waitForLoadState('networkidle');
    // Wait a bit for WebSocket connection
    await this.page.waitForTimeout(2000);
  }

  /**
   * Get all session cards currently displayed
   */
  async getSessionCards() {
    return this.sessionCards.all();
  }

  /**
   * Get a specific session card by index
   */
  async getSessionCard(index: number) {
    return this.sessionCards.nth(index);
  }

  /**
   * Get agent ID from a session card
   */
  async getAgentIdFromCard(cardIndex: number): Promise<string | null> {
    const card = await this.getSessionCard(cardIndex);
    const agentIdBadge = card.locator('.session-meta-badge, .dense-card-meta-badge').first();

    if (await agentIdBadge.count() > 0) {
      const text = await agentIdBadge.textContent();
      return text?.trim() || null;
    }

    return null;
  }

  /**
   * Get model from a session card
   */
  async getModelFromCard(cardIndex: number): Promise<string | null> {
    const card = await this.getSessionCard(cardIndex);
    const badges = card.locator('.session-meta-badge, .dense-card-meta-badge');

    if (await badges.count() > 0) {
      const count = await badges.count();
      // Model is usually the second badge if agentId is present, or the first badge otherwise
      const modelBadge = count > 1 ? badges.nth(1) : badges.first();
      const text = await modelBadge.textContent();
      return text?.trim() || null;
    }

    return null;
  }

  /**
   * Get all meta badges from a session card
   */
  async getMetaBadges(cardIndex: number): Promise<string[]> {
    const card = await this.getSessionCard(cardIndex);
    const badges = card.locator('.session-meta-badge, .dense-card-meta-badge');
    const texts: string[] = [];

    const count = await badges.count();
    for (let i = 0; i < count; i++) {
      const text = await badges.nth(i).textContent();
      if (text) {
        texts.push(text.trim());
      }
    }

    return texts;
  }

  /**
   * Check if a session card has meta information displayed
   */
  async hasMetaInfo(cardIndex: number): Promise<boolean> {
    const card = await this.getSessionCard(cardIndex);
    const metaContainer = card.locator('.session-meta, .dense-card-meta');
    return await metaContainer.count() > 0;
  }

  /**
   * Get session name from card
   */
  async getSessionName(cardIndex: number): Promise<string | null> {
    const card = await this.getSessionCard(cardIndex);
    const nameElement = card.locator('.session-name, .dense-card-name');

    if (await nameElement.count() > 0) {
      const text = await nameElement.textContent();
      return text?.trim() || null;
    }

    return null;
  }

  /**
   * Get session state from card
   */
  async getSessionState(cardIndex: number): Promise<string | null> {
    const card = await this.getSessionCard(cardIndex);
    const stateElement = card.locator('.session-state, [class*="state-"]');

    if (await stateElement.count() > 0) {
      const text = await stateElement.textContent();
      return text?.trim() || null;
    }

    return null;
  }

  /**
   * Toggle view mode between normal and dense
   */
  async toggleViewMode() {
    await this.viewModeToggle.click();
  }

  /**
   * Toggle tool events visibility
   */
  async toggleToolEvents() {
    await this.toolEventsToggle.click();
  }

  /**
   * Take a screenshot of the entire dashboard
   */
  async takeScreenshot(path: string) {
    await this.page.screenshot({ path, fullPage: true });
  }
}