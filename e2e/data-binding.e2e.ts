import { expect, test } from '@playwright/test';
import { collectConsoleMessages, waitForRiveCanvas } from './helpers';

test.describe('Data Binding example', () => {
  test('loads the stocks dashboard canvas', async ({ page }) => {
    await page.goto('/data-binding');
    await waitForRiveCanvas(page);
    await expect(page.locator('h2')).toHaveText('Data Binding');
  });

  test('logs Apple colour changes through the reactive binding pipeline', async ({ page }) => {
    const hits = collectConsoleMessages(page, ['Apple color changed']);
    await page.goto('/data-binding');
    await waitForRiveCanvas(page);

    // Tick loop runs every 2s; direction-same → triggerSpinLogo → state machine
    // mutates apple/currentColor → effect logs. Wait up to ~6s for at least one
    // colour update (probability of no same-direction hit within 3 ticks is
    // ~74%, so we retry the assertion instead of asserting after one tick).
    await expect
      .poll(() => hits.length, { timeout: 12_000, intervals: [500, 1_000] })
      .toBeGreaterThan(0);
  });
});
