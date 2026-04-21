import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { devicePixelRatio } from './device-pixel-ratio';

interface MockMediaQueryList {
  matches: boolean;
  media: string;
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
}

function setGlobalDpr(value: number | undefined): void {
  Object.defineProperty(globalThis, 'devicePixelRatio', { value, configurable: true });
}

describe('devicePixelRatio', () => {
  let injector: Injector;
  let createdQueries: MockMediaQueryList[];
  let originalMatchMedia: typeof globalThis.matchMedia | undefined;

  beforeEach(() => {
    injector = TestBed.inject(Injector);
    createdQueries = [];
    originalMatchMedia = globalThis.matchMedia;
    globalThis.matchMedia = jest.fn().mockImplementation((query: string) => {
      const mql: MockMediaQueryList = {
        matches: false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      createdQueries.push(mql);
      return mql;
    }) as unknown as typeof globalThis.matchMedia;
    setGlobalDpr(1);
  });

  afterEach(() => {
    if (originalMatchMedia) globalThis.matchMedia = originalMatchMedia;
  });

  function mount(custom?: Parameters<typeof devicePixelRatio>[0]) {
    return runInInjectionContext(injector, () => devicePixelRatio(custom));
  }

  describe('initial value', () => {
    it('reads globalThis.devicePixelRatio', () => {
      setGlobalDpr(2);
      const dpr = mount();
      expect(dpr()).toBe(2);
    });

    it('falls back to 1 when globalThis.devicePixelRatio is missing', () => {
      setGlobalDpr(undefined);
      const dpr = mount();
      expect(dpr()).toBe(1);
    });
  });

  describe('clamping', () => {
    it('clamps DPR below 1 up to the minimum', () => {
      setGlobalDpr(0.5);
      const dpr = mount();
      expect(dpr()).toBe(1);
    });

    it('clamps DPR above 3 down to the maximum', () => {
      setGlobalDpr(5);
      const dpr = mount();
      expect(dpr()).toBe(3);
    });

    it('passes through an in-range fractional DPR', () => {
      setGlobalDpr(1.5);
      const dpr = mount();
      expect(dpr()).toBe(1.5);
    });
  });

  describe('custom DPR', () => {
    it('uses a positive custom number instead of the global', () => {
      setGlobalDpr(1);
      const dpr = mount(2);
      expect(dpr()).toBe(2);
    });

    it('clamps a custom number above the max', () => {
      const dpr = mount(10);
      expect(dpr()).toBe(3);
    });

    it('ignores zero and negative custom values — falls back to global', () => {
      setGlobalDpr(2);
      expect(mount(0)()).toBe(2);
      expect(mount(-1)()).toBe(2);
    });

    it('ignores undefined custom — falls back to global', () => {
      setGlobalDpr(2);
      expect(mount(undefined)()).toBe(2);
    });

    it('reacts to a signal-valued custom DPR', () => {
      setGlobalDpr(1);
      const customSignal = signal<number | undefined>(2);
      const dpr = mount(customSignal);
      expect(dpr()).toBe(2);

      customSignal.set(3);
      TestBed.tick();
      expect(dpr()).toBe(3);

      customSignal.set(undefined);
      TestBed.tick();
      expect(dpr()).toBe(1);
    });
  });

  describe('matchMedia subscription', () => {
    it('subscribes to a resolution media query for the current DPR', () => {
      setGlobalDpr(2);
      mount();
      TestBed.tick();

      expect(globalThis.matchMedia).toHaveBeenCalledWith('screen and (resolution: 2dppx)');
      expect(createdQueries[0].addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
    });

    it('updates DPR when the media query emits a change', () => {
      setGlobalDpr(2);
      const dpr = mount();
      TestBed.tick();

      const listener = createdQueries[0].addEventListener.mock.calls[0][1] as () => void;
      setGlobalDpr(3);
      listener();
      TestBed.tick();

      expect(dpr()).toBe(3);
    });

    it('does not subscribe when matchMedia is unavailable', () => {
      (globalThis as { matchMedia?: unknown }).matchMedia = undefined;
      expect(() => mount()).not.toThrow();
    });
  });

  describe('readonly signal contract', () => {
    it('returns a signal without set/update methods', () => {
      const dpr = mount();
      expect('set' in dpr).toBe(false);
      expect('update' in dpr).toBe(false);
    });
  });

  describe('injection context discipline', () => {
    it('throws outside of injection context when no injector opt is passed', () => {
      expect(() => devicePixelRatio()).toThrow();
    });

    it('accepts an explicit injector without throwing', () => {
      expect(() => devicePixelRatio(undefined, { injector })).not.toThrow();
    });
  });
});
