import { isPlatformBrowser } from '@angular/common';
import {
  Injector,
  PLATFORM_ID,
  Signal,
  WritableSignal,
  assertInInjectionContext,
  effect,
  inject,
  runInInjectionContext,
  signal,
} from '@angular/core';

/** Minimum DPR reported to consumers. `1` is the canonical baseline. */
const MIN_DEVICE_PIXEL_RATIO = 1;
/** Cap DPR at 3× — any higher produces massive canvases with no visual gain. */
const MAX_DEVICE_PIXEL_RATIO = 3;

function readGlobalDpr(): number {
  return typeof globalThis !== 'undefined' && typeof globalThis.devicePixelRatio === 'number'
    ? globalThis.devicePixelRatio
    : MIN_DEVICE_PIXEL_RATIO;
}

function clampDpr(raw: number): number {
  return Math.min(Math.max(MIN_DEVICE_PIXEL_RATIO, raw), MAX_DEVICE_PIXEL_RATIO);
}

function readDevicePixelRatio(custom?: number): number {
  if (typeof custom === 'number' && custom > 0) return clampDpr(custom);
  return clampDpr(readGlobalDpr());
}

/**
 * Reactive device pixel ratio. Updates when the user drags the window to a
 * different-resolution display or zooms the browser. Pass `customDevicePixelRatio`
 * to lock the value.
 */
export function devicePixelRatio(
  customDevicePixelRatio?: Signal<number | undefined> | number,
  opts?: { injector?: Injector }
): Signal<number> {
  if (!opts?.injector) assertInInjectionContext(devicePixelRatio);
  const injector = opts?.injector ?? inject(Injector);

  return runInInjectionContext(injector, () => {
    const platformId = inject(PLATFORM_ID);
    const readCustom = (): number | undefined =>
      typeof customDevicePixelRatio === 'function'
        ? customDevicePixelRatio()
        : customDevicePixelRatio;

    const dpr = signal(readDevicePixelRatio(readCustom()));

    effect((onCleanup) => {
      const next = readDevicePixelRatio(readCustom());
      dpr.set(next);
      if (!isPlatformBrowser(platformId) || typeof globalThis.matchMedia !== 'function') return;
      const dispose = subscribeToResolutionChanges(next, readCustom, dpr);
      onCleanup(dispose);
    });

    return dpr.asReadonly();
  });
}

function subscribeToResolutionChanges(
  currentDpr: number,
  readCustom: () => number | undefined,
  dpr: WritableSignal<number>
): () => void {
  const mediaQuery = globalThis.matchMedia(`screen and (resolution: ${currentDpr}dppx)`);
  const listener = (): void => dpr.set(readDevicePixelRatio(readCustom()));
  mediaQuery.addEventListener('change', listener);
  return () => mediaQuery.removeEventListener('change', listener);
}
