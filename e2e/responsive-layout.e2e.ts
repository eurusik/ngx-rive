import { expect, test } from '@playwright/test';
import { canvasBackingSize, waitForRiveCanvas } from './helpers';

test.describe('Responsive Layout example', () => {
  test('canvas resizes when the stage element resizes', async ({ page }) => {
    await page.goto('/responsive-layout');
    const canvas = await waitForRiveCanvas(page);

    const before = await canvasBackingSize(canvas);

    // Shrink the stage and wait for the ResizeObserver → resizeCanvas pipeline
    // to propagate a new backing-store size.
    await page.locator('.stage').evaluate((el) => {
      const stage = el as HTMLElement;
      stage.style.width = '320px';
      stage.style.height = '240px';
    });

    await expect
      .poll(() => canvasBackingSize(canvas), { timeout: 10_000, intervals: [100, 250] })
      .not.toEqual(before);

    const after = await canvasBackingSize(canvas);
    expect(after.width).toBeLessThan(before.width);
    expect(after.height).toBeLessThan(before.height);
  });
});
