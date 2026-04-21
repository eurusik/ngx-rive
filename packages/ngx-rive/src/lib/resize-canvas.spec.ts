import { Injector, WritableSignal, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ResizeCanvasProps, resizeCanvas } from './resize-canvas';

function setWindowSize(width: number, height: number): void {
  Object.defineProperty(globalThis, 'innerWidth', { value: width, configurable: true });
  Object.defineProperty(globalThis, 'innerHeight', { value: height, configurable: true });
}

function dispatchWindowResize(): void {
  globalThis.dispatchEvent(new Event('resize'));
}

describe('resizeCanvas', () => {
  let injector: Injector;
  let canvas: HTMLCanvasElement;
  let container: HTMLElement;
  let riveLoaded: WritableSignal<boolean>;

  beforeEach(() => {
    injector = TestBed.inject(Injector);
    container = document.createElement('div');
    canvas = document.createElement('canvas');
    container.appendChild(canvas);
    document.body.appendChild(container);
    riveLoaded = signal(true);

    setWindowSize(800, 600);
    Object.defineProperty(globalThis, 'devicePixelRatio', { value: 1, configurable: true });
  });

  afterEach(() => {
    container.remove();
  });

  function mount(partial: Partial<ResizeCanvasProps> = {}): void {
    runInInjectionContext(injector, () => {
      resizeCanvas({
        riveLoaded,
        canvas: signal(canvas),
        container: signal(container),
        ...partial,
      });
    });
    TestBed.tick();
  }

  describe('gating', () => {
    it('does not resize until rive is loaded', () => {
      riveLoaded.set(false);
      mount();
      expect(canvas.width).toBe(300);
      expect(canvas.height).toBe(150);
    });

    it('does not resize when shouldResizeCanvasToContainer is false', () => {
      mount({ options: { shouldResizeCanvasToContainer: false } });
      expect(canvas.width).toBe(300);
      expect(canvas.height).toBe(150);
    });

    it('skips when the canvas signal is null', () => {
      expect(() => {
        runInInjectionContext(injector, () => {
          resizeCanvas({
            riveLoaded,
            canvas: signal<HTMLCanvasElement | null>(null),
            container: signal(container),
          });
        });
        TestBed.tick();
      }).not.toThrow();
    });

    it('skips when the container signal is null', () => {
      expect(() => {
        runInInjectionContext(injector, () => {
          resizeCanvas({
            riveLoaded,
            canvas: signal(canvas),
            container: signal<HTMLElement | null>(null),
          });
        });
        TestBed.tick();
      }).not.toThrow();
    });
  });

  describe('direct mode (useDevicePixelRatio: false)', () => {
    it('sets canvas.width/height to the target and leaves inline style untouched', () => {
      mount({ options: { useDevicePixelRatio: false } });
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);
      expect(canvas.style.width).toBe('');
      expect(canvas.style.height).toBe('');
    });
  });

  describe('DPR mode', () => {
    it('scales the backing store by DPR and sets CSS to the target size', () => {
      mount({ options: { customDevicePixelRatio: 2 } });
      expect(canvas.width).toBe(1600);
      expect(canvas.height).toBe(1200);
      expect(canvas.style.width).toBe('800px');
      expect(canvas.style.height).toBe('600px');
    });

    it('uses DPR=1 when no custom DPR is supplied and globalThis.devicePixelRatio is 1', () => {
      mount();
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);
      expect(canvas.style.width).toBe('800px');
    });
  });

  describe('artboard fit mode', () => {
    it('sets container height from the artboard aspect and matches the canvas', () => {
      mount({
        options: { fitCanvasToArtboardHeight: true, customDevicePixelRatio: 1 },
        artboardBounds: signal({ minX: 0, minY: 0, maxX: 400, maxY: 200 }),
      });
      expect(container.style.height).toBe('400px');
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(400);
    });

    it('ignores artboard fit when bounds are undefined', () => {
      mount({
        options: { fitCanvasToArtboardHeight: true, customDevicePixelRatio: 1 },
        artboardBounds: signal(undefined),
      });
      expect(container.style.height).toBe('');
      expect(canvas.height).toBe(600);
    });
  });

  describe('onCanvasHasResized callback', () => {
    it('fires on the first sizing', () => {
      const cb = jest.fn();
      mount({ onCanvasHasResized: cb });
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('fires again when the observed size changes', () => {
      const cb = jest.fn();
      mount({ onCanvasHasResized: cb, options: { useDevicePixelRatio: false } });
      cb.mockClear();

      setWindowSize(1024, 768);
      dispatchWindowResize();
      TestBed.tick();

      expect(cb).toHaveBeenCalled();
      expect(canvas.width).toBe(1024);
      expect(canvas.height).toBe(768);
    });

    it('does not fire on subsequent ticks when nothing changed', () => {
      const cb = jest.fn();
      mount({ onCanvasHasResized: cb, options: { useDevicePixelRatio: false } });
      expect(cb).toHaveBeenCalledTimes(1);

      dispatchWindowResize();
      TestBed.tick();
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  describe('canvas swap', () => {
    it('sizes the new canvas after the canvas signal changes', () => {
      const canvasSignal = signal(canvas);
      runInInjectionContext(injector, () => {
        resizeCanvas({
          riveLoaded,
          canvas: canvasSignal,
          container: signal(container),
          options: { useDevicePixelRatio: false },
        });
      });
      TestBed.tick();
      expect(canvas.width).toBe(800);

      const next = document.createElement('canvas');
      canvasSignal.set(next);
      TestBed.tick();
      expect(next.width).toBe(800);
      expect(next.height).toBe(600);
    });
  });
});
