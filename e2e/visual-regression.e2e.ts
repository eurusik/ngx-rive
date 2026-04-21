import { expect, test } from '@playwright/test';
import { waitForRiveCanvas } from './helpers';

/**
 * Loose-threshold canvas screenshots: primary guard is "canvas is not blank".
 * Rive animations mutate every frame, so we accept high pixel diff between
 * runs — regressions we want to catch are gross failures (blank canvas, wrong
 * artboard, crashed renderer) rather than subtle animation drift.
 */
const LOOSE = { maxDiffPixelRatio: 0.6, animations: 'disabled' as const };

test.describe('Visual regression (catches blank/crashed canvas)', () => {
  test('simple route renders a non-blank canvas', async ({ page }, testInfo) => {
    await page.goto('/simple');
    const canvas = await waitForRiveCanvas(page);
    await page.waitForTimeout(500);
    await expect(canvas).toHaveScreenshot(`simple-${testInfo.project.name}.png`, LOOSE);
  });

  test('data-binding route renders a non-blank canvas', async ({ page }, testInfo) => {
    await page.goto('/data-binding');
    const canvas = await waitForRiveCanvas(page);
    await page.waitForTimeout(500);
    await expect(canvas).toHaveScreenshot(`data-binding-${testInfo.project.name}.png`, LOOSE);
  });

  test('events route renders a non-blank canvas', async ({ page }, testInfo) => {
    await page.goto('/events');
    const canvas = await waitForRiveCanvas(page);
    await page.waitForTimeout(500);
    await expect(canvas).toHaveScreenshot(`events-${testInfo.project.name}.png`, LOOSE);
  });

  test('responsive-layout route renders a non-blank canvas', async ({ page }, testInfo) => {
    await page.goto('/responsive-layout');
    const canvas = await waitForRiveCanvas(page);
    await page.waitForTimeout(500);
    await expect(canvas).toHaveScreenshot(
      `responsive-layout-${testInfo.project.name}.png`,
      LOOSE
    );
  });
});
