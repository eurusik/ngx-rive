import { expect, request, test } from '@playwright/test';
import { canvasBackingSize, waitForRiveCanvas } from './helpers';

test.describe('SSR hydration', () => {
  test('initial HTML contains server-rendered canvas with ng-server-context', async ({
    baseURL,
  }) => {
    const ctx = await request.newContext();
    const response = await ctx.get(`${baseURL}/simple`);
    expect(response.status()).toBe(200);

    const html = await response.text();
    expect(html).toContain('ng-server-context');
    expect(html).toMatch(/<canvas[^>]*ngxrive[^>]*>/);
    expect(html).toMatch(/aria-label="Avatar animation"/);
    expect(html).toMatch(/role="img"/);
    await ctx.dispose();
  });

  test('hydrates cleanly without NG0500 / NG0501 mismatch errors on /simple', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/simple');
    const canvas = await waitForRiveCanvas(page);
    const size = await canvasBackingSize(canvas);
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);

    const hydrationFailures = errors.filter((e) => /NG050\d/.test(e));
    expect(hydrationFailures).toEqual([]);
  });

  test('hydrates /data-binding and the binding pipeline still fires', async ({ page }) => {
    const errors: string[] = [];
    const appleHits: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
      if (msg.text().includes('Apple color changed')) appleHits.push(msg.text());
    });

    await page.goto('/data-binding');
    await waitForRiveCanvas(page);

    // Directive constructor runs post-hydration; effects register; tick loop
    // eventually fires the colour-change binding.
    await expect
      .poll(() => appleHits.length, { timeout: 12_000, intervals: [500, 1_000] })
      .toBeGreaterThan(0);

    const hydrationFailures = errors.filter((e) => /NG050\d/.test(e));
    expect(hydrationFailures).toEqual([]);
  });

  test('hydrates all routes without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    for (const route of ['/simple', '/events', '/responsive-layout', '/scroll']) {
      await page.goto(route);
      await waitForRiveCanvas(page);
    }

    const hydrationFailures = errors.filter((e) => /NG050\d/.test(e));
    expect(hydrationFailures).toEqual([]);
  });
});
