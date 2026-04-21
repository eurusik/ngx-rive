import { expect, test } from '@playwright/test';
import { canvasBackingSize, waitForRiveCanvas } from './helpers';

test.describe('Simple example', () => {
  test('loads an avatar animation into a sized canvas', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/simple');
    const canvas = await waitForRiveCanvas(page);

    const { width, height } = await canvasBackingSize(canvas);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);

    await expect(page.locator('h2')).toHaveText('Simple');
    expect(errors).toEqual([]);
  });

  test('forwards aria-label to the canvas', async ({ page }) => {
    await page.goto('/simple');
    await waitForRiveCanvas(page);
    await expect(page.locator('canvas')).toHaveAttribute('aria-label', 'Avatar animation');
  });
});
