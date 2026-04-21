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
import type { Dimensions } from './types';

function hasResizeObserver(): boolean {
  return typeof globalThis !== 'undefined' && globalThis.ResizeObserver !== undefined;
}

const throttle = <Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number
): ((...args: Args) => void) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: Args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Reactive wrapper around {@link ResizeObserver}. Falls back to `window.resize`
 * in browsers without ResizeObserver.
 */
export function containerSize(
  containerEl: Signal<HTMLElement | null | undefined>,
  shouldResizeCanvasToContainer: Signal<boolean> | boolean = true,
  opts?: { injector?: Injector }
): Signal<Dimensions> {
  if (!opts?.injector) assertInInjectionContext(containerSize);
  const injector = opts?.injector ?? inject(Injector);

  return runInInjectionContext(injector, () => {
    const platformId = inject(PLATFORM_ID);
    const size = signal<Dimensions>({ width: 0, height: 0 });

    const isResizeEnabled = (): boolean =>
      typeof shouldResizeCanvasToContainer === 'function'
        ? shouldResizeCanvasToContainer()
        : shouldResizeCanvasToContainer;

    effect((onCleanup) => {
      if (!isPlatformBrowser(platformId) || !isResizeEnabled()) return;
      const element = containerEl();
      if (!element) return;

      const dispose = hasResizeObserver()
        ? observeWithResizeObserver(element, size)
        : observeWithWindowResize(size);
      onCleanup(dispose);
    });

    return size.asReadonly();
  });
}

/** Observe element size via native `ResizeObserver`; returns dispose fn. */
function observeWithResizeObserver(
  element: HTMLElement,
  size: WritableSignal<Dimensions>
): () => void {
  // Delay 0ms === defer to the next macrotask. ResizeObserver can fire
  // multiple entries in the same frame during animated layout changes;
  // we coalesce them and keep only the last content rect.
  const handleEntries = throttle((entries: ResizeObserverEntry[]) => {
    const last = entries[entries.length - 1];
    if (!last) return;
    size.set({ width: last.contentRect.width, height: last.contentRect.height });
  }, 0);

  const observer = new globalThis.ResizeObserver(handleEntries);
  observer.observe(element);
  return () => observer.disconnect();
}

/** Fallback path for browsers without ResizeObserver — follow window size. */
function observeWithWindowResize(size: WritableSignal<Dimensions>): () => void {
  const onResize = (): void => {
    size.set({ width: globalThis.innerWidth, height: globalThis.innerHeight });
  };
  onResize();
  globalThis.addEventListener('resize', onResize);
  return () => globalThis.removeEventListener('resize', onResize);
}
