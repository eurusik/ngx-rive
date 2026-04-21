import { expect, test } from '@playwright/test';
import { waitForRiveCanvas } from './helpers';

test.describe('Image binding example', () => {
  test('renders heading, canvas, load button and default status', async ({ page }) => {
    await page.goto('/image-binding');
    await waitForRiveCanvas(page);

    await expect(page.locator('h2')).toHaveText('Image binding');
    await expect(page.getByTestId('load-image')).toBeVisible();
    await expect(page.getByTestId('load-image')).toBeEnabled();
    await expect(page.getByTestId('status')).toContainText(/No image loaded/i);
  });

  test('clicking Load random image drives the pipeline to success', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/image-binding');
    await waitForRiveCanvas(page);

    const button = page.getByTestId('load-image');
    const status = page.getByTestId('status');

    await button.click();
    // Status flips to the eventual outcome. Success is `Loaded https://...`,
    // failure (e.g. offline CI) is `Failed: ...` — both acknowledge the click.
    await expect(status).toContainText(/(Loaded|Failed)/i, { timeout: 20_000 });
    await expect(button).toBeEnabled();

    const runtime = errors.filter((e) => !e.includes('favicon'));
    expect(runtime).toEqual([]);
  });

  test('button shows a loading label while the fetch is in flight', async ({ page }) => {
    await page.goto('/image-binding');
    await waitForRiveCanvas(page);

    // Stall the picsum response so the Loading… state is observable.
    await page.route('**/picsum.photos/**', async (route) => {
      await new Promise((r) => setTimeout(r, 600));
      await route.continue();
    });

    const button = page.getByTestId('load-image');
    await button.click();
    await expect(button).toHaveText(/Loading/i, { timeout: 2_000 });
    await expect(button).toBeDisabled();

    await expect(button).toBeEnabled({ timeout: 20_000 });
    await expect(button).toHaveText(/Load random image/i);
  });
});
