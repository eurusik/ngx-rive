import { expect, Locator, Page } from '@playwright/test';

/**
 * Waits until the canvas has been sized by `resizeCanvas` (backing store > 0)
 * and optionally the Rive runtime has decoded at least one frame.
 */
export async function waitForRiveCanvas(page: Page, selector = 'canvas'): Promise<Locator> {
  const canvas = page.locator(selector).first();
  await expect(canvas).toBeVisible();
  await expect
    .poll(
      async () => {
        return canvas.evaluate((el) => {
          const c = el as HTMLCanvasElement;
          return c.width > 0 && c.height > 0;
        });
      },
      { timeout: 15_000, intervals: [100, 250, 500] }
    )
    .toBe(true);
  return canvas;
}

export async function canvasBackingSize(canvas: Locator): Promise<{ width: number; height: number }> {
  return canvas.evaluate((el) => {
    const c = el as HTMLCanvasElement;
    return { width: c.width, height: c.height };
  });
}

/** Collects console messages whose text matches any of the substrings. */
export function collectConsoleMessages(page: Page, substrings: string[]): string[] {
  const hits: string[] = [];
  page.on('console', (message) => {
    const text = message.text();
    if (substrings.some((s) => text.includes(s))) hits.push(text);
  });
  return hits;
}
