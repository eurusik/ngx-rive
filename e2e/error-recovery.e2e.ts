import { expect, test } from '@playwright/test';
import { waitForRiveCanvas } from './helpers';

test.describe('Error recovery', () => {
  test('emits load error for a missing src and recovers after src re-assignment', async ({ page }) => {
    await page.goto('/error-recovery');

    const status = page.getByTestId('status');
    await expect(status).toContainText('error', { timeout: 15_000 });

    await page.getByTestId('fix').click();
    await expect(status).toContainText('ready', { timeout: 15_000 });

    await waitForRiveCanvas(page);
  });
});
