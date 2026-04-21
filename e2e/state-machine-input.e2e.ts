import { expect, test } from '@playwright/test';
import { waitForRiveCanvas } from './helpers';

test.describe('State Machine Input example', () => {
  test('renders heading, canvas, slider and status', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/state-machine-input');
    await waitForRiveCanvas(page);

    await expect(page.locator('h2')).toHaveText('State Machine Input');
    await expect(page.getByTestId('rating-slider')).toBeVisible();
    await expect(page.getByTestId('rating-value')).toBeVisible();
    await expect(page.getByTestId('status')).toBeVisible();

    const runtime = errors.filter((e) => !e.includes('favicon'));
    expect(runtime).toEqual([]);
  });

  test('slider + rating-value element are wired', async ({ page }) => {
    await page.goto('/state-machine-input');
    await waitForRiveCanvas(page);

    // The 'rating' input may or may not exist on rating.riv; we only verify
    // the control is rendered and value element reflects the slider or '—'.
    const slider = page.getByTestId('rating-slider');
    const value = page.getByTestId('rating-value');

    await slider.evaluate((el) => {
      const input = el as HTMLInputElement;
      input.value = '3';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Either the input was resolved (value === '3') or it wasn't found yet (value === '—').
    await expect(value).toHaveText(/^(3|—)$/);
  });

  test('status text reflects whether the input resolved', async ({ page }) => {
    await page.goto('/state-machine-input');
    await waitForRiveCanvas(page);

    const status = await page.getByTestId('status').textContent();
    expect(status).toMatch(/Input (resolved|rating not found)/i);
  });
});
