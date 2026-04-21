import { expect, test } from '@playwright/test';
import { waitForRiveCanvas } from './helpers';

test.describe('Events example', () => {
  test('loads the rating canvas', async ({ page }) => {
    await page.goto('/events');
    await waitForRiveCanvas(page);
    await expect(page.locator('h2')).toHaveText('Events');
  });

  test('forwards aria-label on the canvas', async ({ page }) => {
    await page.goto('/events');
    const canvas = await waitForRiveCanvas(page);
    await expect(canvas).toHaveAttribute('aria-label', 'Star rating animation');
  });

  test('Rive event handler is wired (no runtime errors on interaction)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/events');
    const canvas = await waitForRiveCanvas(page);

    // Click the middle of the canvas — exact star hit depends on the artboard
    // layout; we only assert the listener pipeline does not throw, even if no
    // star is hit.
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
    await page.waitForTimeout(300);
    expect(errors).toEqual([]);
  });
});
