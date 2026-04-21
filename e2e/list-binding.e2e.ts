import { expect, Page, test } from '@playwright/test';
import { waitForRiveCanvas } from './helpers';

async function readLength(page: Page): Promise<number> {
  const text = (await page.getByTestId('length').textContent()) ?? '';
  return Number(text.match(/\d+/)?.[0] ?? 0);
}

async function expectLengthToBe(page: Page, target: number): Promise<void> {
  await expect.poll(() => readLength(page), { timeout: 5_000, intervals: [100, 250] }).toBe(target);
}

async function readItems(page: Page): Promise<string[]> {
  return page.locator('[data-testid="items-html"] li').allTextContents();
}

async function expectItemsLengthToBe(page: Page, target: number): Promise<void> {
  await expect
    .poll(async () => (await readItems(page)).length, { timeout: 5_000, intervals: [100, 250] })
    .toBe(target);
}

/** Waits for the list to finish initial population (length > 0). */
async function settled(page: Page): Promise<number> {
  await waitForRiveCanvas(page);
  await expect.poll(() => readLength(page), { timeout: 5_000, intervals: [100, 250] }).toBeGreaterThan(0);
  return readLength(page);
}

test.describe('List binding example', () => {
  test('renders heading, canvas, all 5 action buttons and HTML list', async ({ page }) => {
    await page.goto('/list-binding');
    await settled(page);

    await expect(page.locator('h2')).toHaveText('List binding');
    for (const id of ['add', 'add-at-1', 'remove-first', 'remove-first-idx', 'swap']) {
      await expect(page.getByTestId(id)).toBeVisible();
    }
    expect((await readItems(page)).length).toBeGreaterThan(0);
  });

  test('add appends an item with a readable label', async ({ page }) => {
    await page.goto('/list-binding');
    const initial = await settled(page);

    await page.getByTestId('add').click();
    await expectLengthToBe(page, initial + 1);
    await expectItemsLengthToBe(page, initial + 1);

    const items = await readItems(page);
    const appended = items[items.length - 1];
    expect(appended).toMatch(/Item \d+/);
  });

  test('add×2 adds both items and length + HTML list agree', async ({ page }) => {
    await page.goto('/list-binding');
    const initial = await settled(page);

    await page.getByTestId('add').click();
    await page.getByTestId('add').click();
    await expectLengthToBe(page, initial + 2);
    await expectItemsLengthToBe(page, initial + 2);
  });

  test('remove-first drops the leading item', async ({ page }) => {
    await page.goto('/list-binding');
    await settled(page);

    const before = await readItems(page);
    await page.getByTestId('remove-first').click();
    await expectLengthToBe(page, before.length - 1);

    const after = await readItems(page);
    expect(after.length).toBe(before.length - 1);
    // The item that was at index 1 should now be at index 0.
    expect(after[0]).toContain(before[1].replace(/^\[\d+\]\s*/, ''));
  });

  test('remove-first-idx uses the by-index path and decrements length', async ({ page }) => {
    await page.goto('/list-binding');
    await settled(page);

    const before = await readItems(page);
    await page.getByTestId('remove-first-idx').click();
    await expectLengthToBe(page, before.length - 1);
    await expectItemsLengthToBe(page, before.length - 1);
  });

  test('insert-at-1 places the new item at index 1', async ({ page }) => {
    await page.goto('/list-binding');
    const before = await settled(page);

    await page.getByTestId('add-at-1').click();
    await expectLengthToBe(page, before + 1);

    const items = await readItems(page);
    // First item stays at [0]; inserted item ends up at [1].
    expect(items[1]).toContain('Inserted at 1');
  });

  test('swap actually exchanges items 0 and 1', async ({ page }) => {
    await page.goto('/list-binding');
    await settled(page);

    const before = await readItems(page);
    expect(before.length).toBeGreaterThanOrEqual(2);
    const beforeZero = before[0].replace(/^\[\d+\]\s*/, '');
    const beforeOne = before[1].replace(/^\[\d+\]\s*/, '');

    await page.getByTestId('swap').click();
    // Swap is synchronous on Rive's side; poll just to let Angular re-render.
    await expect
      .poll(async () => (await readItems(page))[0].replace(/^\[\d+\]\s*/, ''), {
        timeout: 5_000,
        intervals: [100, 250],
      })
      .toBe(beforeOne);

    const after = await readItems(page);
    expect(after[1].replace(/^\[\d+\]\s*/, '')).toBe(beforeZero);
    expect(after.length).toBe(before.length);
  });

  test('does not throw runtime errors during a full add-insert-swap-remove cycle', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/list-binding');
    const initial = await settled(page);

    await page.getByTestId('add').click();
    await page.getByTestId('add-at-1').click();
    await page.getByTestId('swap').click();
    await page.getByTestId('remove-first').click();
    await page.getByTestId('remove-first-idx').click();
    await page.waitForTimeout(300);

    expect(await readLength(page)).toBe(initial);
    const runtime = errors.filter((e) => !e.includes('favicon'));
    expect(runtime).toEqual([]);
  });
});
