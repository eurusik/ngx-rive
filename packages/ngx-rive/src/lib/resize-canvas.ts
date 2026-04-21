import {
  Injector,
  Signal,
  assertInInjectionContext,
  effect,
  inject,
  runInInjectionContext,
} from '@angular/core';
import type { Bounds } from '@rive-app/canvas';
import { containerSize } from './container-size';
import { devicePixelRatio } from './device-pixel-ratio';
import type { Dimensions, NgxRiveOptions } from './types';
import { getOptions } from './utils';

export interface ResizeCanvasProps {
  riveLoaded: Signal<boolean>;
  canvas: Signal<HTMLCanvasElement | null>;
  container: Signal<HTMLElement | null | undefined>;
  onCanvasHasResized?: () => void;
  options?: Partial<NgxRiveOptions>;
  artboardBounds?: Signal<Bounds | undefined>;
}

interface ResizeState {
  container: Dimensions;
  canvas: Dimensions;
  canvasEl: HTMLCanvasElement | null;
  firstSizing: boolean;
}

interface LayoutContext {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  target: Dimensions;
  dpr: number;
  state: ResizeState;
  options: NgxRiveOptions;
  hasBounds: boolean;
}

const EMPTY_DIMENSIONS: Dimensions = { width: 0, height: 0 };

export function resizeCanvas(props: ResizeCanvasProps, opts?: { injector?: Injector }): void {
  if (!opts?.injector) assertInInjectionContext(resizeCanvas);
  const injector = opts?.injector ?? inject(Injector);

  runInInjectionContext(injector, () => {
    const resolvedOptions = getOptions(props.options ?? {});
    const state: ResizeState = createInitialState();
    const dpr = devicePixelRatio(resolvedOptions.customDevicePixelRatio || undefined);
    const observedSize = containerSize(
      props.container,
      resolvedOptions.shouldResizeCanvasToContainer
    );

    effect(() => {
      if (!resolvedOptions.shouldResizeCanvasToContainer) return;
      const container = props.container();
      const canvas = props.canvas();
      if (!container || !canvas || !props.riveLoaded()) return;

      resetStateOnCanvasSwap(state, canvas);

      const bounds = props.artboardBounds?.();
      const target = computeTargetDimensions(observedSize(), bounds, resolvedOptions);
      const hasResized = applyLayout({
        canvas,
        container,
        target,
        dpr: dpr(),
        state,
        options: resolvedOptions,
        hasBounds: bounds !== undefined,
      });

      if (props.onCanvasHasResized && (state.firstSizing || hasResized)) {
        props.onCanvasHasResized();
      }
      state.firstSizing = false;
    });
  });
}

function createInitialState(): ResizeState {
  return {
    container: EMPTY_DIMENSIONS,
    canvas: EMPTY_DIMENSIONS,
    canvasEl: null,
    firstSizing: true,
  };
}

function resetStateOnCanvasSwap(state: ResizeState, canvas: HTMLCanvasElement): void {
  if (canvas === state.canvasEl) return;
  state.canvas = EMPTY_DIMENSIONS;
  state.container = EMPTY_DIMENSIONS;
  state.canvasEl = canvas;
}

function computeTargetDimensions(
  observed: Dimensions,
  bounds: Bounds | undefined,
  options: NgxRiveOptions
): Dimensions {
  if (options.fitCanvasToArtboardHeight && bounds) {
    return { width: observed.width, height: observed.width * (bounds.maxY / bounds.maxX) };
  }
  return observed;
}

function applyLayout(ctx: LayoutContext): boolean {
  const containerSizeChanged = hasDimensionsChanged(ctx.target, ctx.state.container);
  let hasResized = false;

  if (ctx.options.fitCanvasToArtboardHeight && ctx.hasBounds && containerSizeChanged) {
    applyArtboardContainerHeight(ctx.container, ctx.target.height);
    hasResized = true;
  }

  if (ctx.options.useDevicePixelRatio) {
    if (applyCanvasWithDpr(ctx, containerSizeChanged)) hasResized = true;
  } else if (containerSizeChanged) {
    applyCanvasDirect(ctx);
    hasResized = true;
  }

  ctx.state.container = { width: ctx.target.width, height: ctx.target.height };
  return hasResized;
}

function hasDimensionsChanged(a: Dimensions, b: Dimensions): boolean {
  return a.width !== b.width || a.height !== b.height;
}

function applyArtboardContainerHeight(container: HTMLElement, height: number): void {
  container.style.height = `${height}px`;
}

function applyCanvasWithDpr(ctx: LayoutContext, containerSizeChanged: boolean): boolean {
  const scaledWidth = ctx.dpr * ctx.target.width;
  const scaledHeight = ctx.dpr * ctx.target.height;
  const canvasSizeChanged =
    scaledWidth !== ctx.state.canvas.width || scaledHeight !== ctx.state.canvas.height;
  if (!containerSizeChanged && !canvasSizeChanged) return false;

  ctx.canvas.width = scaledWidth;
  ctx.canvas.height = scaledHeight;
  ctx.canvas.style.width = `${ctx.target.width}px`;
  ctx.canvas.style.height = `${ctx.target.height}px`;
  ctx.state.canvas = { width: scaledWidth, height: scaledHeight };
  return true;
}

function applyCanvasDirect(ctx: LayoutContext): void {
  ctx.canvas.width = ctx.target.width;
  ctx.canvas.height = ctx.target.height;
  ctx.state.canvas = { width: ctx.target.width, height: ctx.target.height };
}
