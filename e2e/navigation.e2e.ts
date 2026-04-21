import { expect, test } from '@playwright/test';
import { waitForRiveCanvas } from './helpers';

test.describe('Playground navigation', () => {
  test('navigates between all four examples without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    // Root redirects to /simple
    await expect(page).toHaveURL(/\/simple$/);
    await waitForRiveCanvas(page);

    await page.getByRole('link', { name: 'Data Binding' }).click();
    await expect(page).toHaveURL(/\/data-binding$/);
    await waitForRiveCanvas(page);

    await page.getByRole('link', { name: 'Events' }).click();
    await expect(page).toHaveURL(/\/events$/);
    await waitForRiveCanvas(page);

    await page.getByRole('link', { name: 'Responsive' }).click();
    await expect(page).toHaveURL(/\/responsive-layout$/);
    await waitForRiveCanvas(page);

    await page.getByRole('link', { name: 'Simple' }).click();
    await expect(page).toHaveURL(/\/simple$/);
    await waitForRiveCanvas(page);

    expect(errors).toEqual([]);
  });

  test('cleans up the old canvas on route change (canvas count stays at 1)', async ({ page }) => {
    await page.goto('/simple');
    await waitForRiveCanvas(page);
    expect(await page.locator('canvas').count()).toBe(1);

    await page.getByRole('link', { name: 'Data Binding' }).click();
    await waitForRiveCanvas(page);
    expect(await page.locator('canvas').count()).toBe(1);

    await page.getByRole('link', { name: 'Events' }).click();
    await waitForRiveCanvas(page);
    expect(await page.locator('canvas').count()).toBe(1);
  });
});
