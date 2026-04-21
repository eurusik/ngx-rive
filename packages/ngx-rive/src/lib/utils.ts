import type { NgxRiveOptions } from './types';

export const defaultNgxRiveOptions: NgxRiveOptions = {
  useDevicePixelRatio: true,
  customDevicePixelRatio: 0,
  fitCanvasToArtboardHeight: false,
  useOffscreenRenderer: true,
  shouldResizeCanvasToContainer: true,
  shouldUseIntersectionObserver: true,
};

export function getOptions(opts: Partial<NgxRiveOptions>): NgxRiveOptions {
  return Object.assign({}, defaultNgxRiveOptions, opts);
}
