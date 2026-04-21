import { TestBed } from '@angular/core/testing';
import { NgxRiveIntersectionObserver } from './intersection-observer.service';

interface ObserverMock {
  observe: jest.Mock;
  unobserve: jest.Mock;
  disconnect: jest.Mock;
}

function makeEntry(target: Element, isIntersecting = true): IntersectionObserverEntry {
  return { target, isIntersecting } as unknown as IntersectionObserverEntry;
}

describe('NgxRiveIntersectionObserver', () => {
  let observerMock: ObserverMock;
  let intersectionCallback: (entries: IntersectionObserverEntry[]) => void;
  let originalCtor: typeof IntersectionObserver | undefined;

  beforeEach(() => {
    observerMock = { observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn() };
    originalCtor = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = jest
      .fn()
      .mockImplementation((cb: typeof intersectionCallback) => {
        intersectionCallback = cb;
        return observerMock;
      }) as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    if (originalCtor) globalThis.IntersectionObserver = originalCtor;
  });

  describe('lazy observer creation', () => {
    it('creates a shared observer on the first observe() call and registers the callback', () => {
      const service = TestBed.inject(NgxRiveIntersectionObserver);
      const el = document.createElement('div');
      const cb = jest.fn();

      service.observe(el, cb);
      expect(globalThis.IntersectionObserver).toHaveBeenCalledTimes(1);
      expect(observerMock.observe).toHaveBeenCalledWith(el);

      const entry = makeEntry(el, true);
      intersectionCallback([entry]);
      expect(cb).toHaveBeenCalledWith(entry);
    });

    it('reuses the same observer for subsequent elements', () => {
      const service = TestBed.inject(NgxRiveIntersectionObserver);
      service.observe(document.createElement('div'), jest.fn());
      service.observe(document.createElement('div'), jest.fn());
      expect(globalThis.IntersectionObserver).toHaveBeenCalledTimes(1);
      expect(observerMock.observe).toHaveBeenCalledTimes(2);
    });
  });

  describe('per-element callback routing', () => {
    it('routes each entry to the callback registered for its target', () => {
      const service = TestBed.inject(NgxRiveIntersectionObserver);
      const a = document.createElement('div');
      const b = document.createElement('div');
      const cbA = jest.fn();
      const cbB = jest.fn();

      service.observe(a, cbA);
      service.observe(b, cbB);

      const entryA = makeEntry(a, true);
      const entryB = makeEntry(b, false);
      intersectionCallback([entryA, entryB]);

      expect(cbA).toHaveBeenCalledWith(entryA);
      expect(cbA).not.toHaveBeenCalledWith(entryB);
      expect(cbB).toHaveBeenCalledWith(entryB);
      expect(cbB).not.toHaveBeenCalledWith(entryA);
    });

    it('replaces the callback when the same element is observed again', () => {
      const service = TestBed.inject(NgxRiveIntersectionObserver);
      const el = document.createElement('div');
      const first = jest.fn();
      const second = jest.fn();

      service.observe(el, first);
      service.observe(el, second);

      intersectionCallback([makeEntry(el, true)]);
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalled();
    });
  });

  describe('unobserve', () => {
    it('removes the callback and tells the observer to stop watching', () => {
      const service = TestBed.inject(NgxRiveIntersectionObserver);
      const el = document.createElement('div');
      const cb = jest.fn();

      service.observe(el, cb);
      service.unobserve(el);

      expect(observerMock.unobserve).toHaveBeenCalledWith(el);
      intersectionCallback([makeEntry(el, false)]);
      expect(cb).not.toHaveBeenCalled();
    });

    it('is a no-op when unobserving an element that was never observed', () => {
      const service = TestBed.inject(NgxRiveIntersectionObserver);
      const el = document.createElement('div');
      service.observe(document.createElement('div'), jest.fn());
      expect(() => service.unobserve(el)).not.toThrow();
      expect(observerMock.unobserve).toHaveBeenCalledWith(el);
    });

    it('is a no-op when called before any observe()', () => {
      const service = TestBed.inject(NgxRiveIntersectionObserver);
      expect(() => service.unobserve(document.createElement('div'))).not.toThrow();
      expect(globalThis.IntersectionObserver).not.toHaveBeenCalled();
    });
  });

  describe('missing callback handling', () => {
    it('warns in dev mode when an entry arrives for an unregistered target', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        const service = TestBed.inject(NgxRiveIntersectionObserver);
        service.observe(document.createElement('div'), jest.fn());

        const stranger = document.createElement('div');
        intersectionCallback([makeEntry(stranger, true)]);

        expect(warn).toHaveBeenCalledWith(expect.stringContaining('ngx-rive'));
      } finally {
        warn.mockRestore();
      }
    });

    it('still dispatches other entries in the same batch', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        const service = TestBed.inject(NgxRiveIntersectionObserver);
        const known = document.createElement('div');
        const stranger = document.createElement('div');
        const cb = jest.fn();
        service.observe(known, cb);

        intersectionCallback([makeEntry(stranger, true), makeEntry(known, true)]);

        expect(cb).toHaveBeenCalledTimes(1);
      } finally {
        warn.mockRestore();
      }
    });
  });

  describe('SSR / unsupported environment fallback', () => {
    it('does not throw when globalThis.IntersectionObserver is absent', () => {
      (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = undefined;
      const service = TestBed.inject(NgxRiveIntersectionObserver);
      const el = document.createElement('div');

      expect(() => service.observe(el, jest.fn())).not.toThrow();
      expect(() => service.unobserve(el)).not.toThrow();
    });
  });

  describe('singleton', () => {
    it('providedIn: "root" yields the same instance across injections', () => {
      const a = TestBed.inject(NgxRiveIntersectionObserver);
      const b = TestBed.inject(NgxRiveIntersectionObserver);
      expect(a).toBe(b);
    });
  });
});
