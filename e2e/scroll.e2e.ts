import { expect, test } from '@playwright/test';
import { canvasBackingSize, waitForRiveCanvas } from './helpers';

test.describe('Scroll / IntersectionObserver pause/resume', () => {
  test('canvas survives scroll off-screen and back with no JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/scroll');
    const canvas = await waitForRiveCanvas(page);
    const before = await canvasBackingSize(canvas);

    // Scroll canvas off-screen
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Scroll back to top so canvas is visible again
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    await expect(canvas).toBeVisible();
    const after = await canvasBackingSize(canvas);
    expect(after.width).toBe(before.width);
    expect(after.height).toBe(before.height);
    expect(errors).toEqual([]);
  });
});
