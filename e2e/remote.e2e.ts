import { expect, test } from '@playwright/test';
import { canvasBackingSize, waitForRiveCanvas } from './helpers';

test.describe('Remote URL example', () => {
  test('loads a .riv file from the public CDN with no runtime errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/remote');
    const canvas = await waitForRiveCanvas(page);

    await expect(page.locator('h2')).toHaveText('Remote URL');

    const { width, height } = await canvasBackingSize(canvas);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);

    const runtime = errors.filter((e) => !e.includes('favicon'));
    expect(runtime).toEqual([]);
  });

  test('forwards aria-label onto the canvas', async ({ page }) => {
    await page.goto('/remote');
    const canvas = await waitForRiveCanvas(page);
    await expect(canvas).toHaveAttribute('aria-label', 'Remote vehicles animation');
  });

  test('network request for the CDN .riv succeeded (2xx)', async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes('cdn.rive.app') && resp.url().endsWith('.riv'),
      { timeout: 15_000 }
    );
    await page.goto('/remote');
    const response = await responsePromise;
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);
  });
});
