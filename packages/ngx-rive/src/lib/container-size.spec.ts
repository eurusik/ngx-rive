import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { containerSize } from './container-size';

function setWindowSize(width: number, height: number): void {
  Object.defineProperty(globalThis, 'innerWidth', { value: width, configurable: true });
  Object.defineProperty(globalThis, 'innerHeight', { value: height, configurable: true });
}

describe('containerSize (window-resize fallback in jsdom)', () => {
  let injector: Injector;
  let element: HTMLElement;

  beforeEach(() => {
    injector = TestBed.inject(Injector);
    element = document.createElement('div');
    document.body.appendChild(element);
    setWindowSize(1024, 768);
  });

  afterEach(() => {
    element.remove();
  });

  function mount(
    container: HTMLElement | null | undefined = element,
    enabled: Parameters<typeof containerSize>[1] = true
  ) {
    return runInInjectionContext(injector, () =>
      containerSize(signal<HTMLElement | null | undefined>(container), enabled)
    );
  }

  describe('initial read', () => {
    it('reflects globalThis.innerWidth/innerHeight after subscription', () => {
      const size = mount();
      TestBed.tick();
      expect(size()).toEqual({ width: 1024, height: 768 });
    });

    it('updates when window fires resize', () => {
      const size = mount();
      TestBed.tick();
      setWindowSize(800, 600);
      globalThis.dispatchEvent(new Event('resize'));
      expect(size()).toEqual({ width: 800, height: 600 });
    });
  });

  describe('gating', () => {
    it('stays at {0,0} when disabled via boolean', () => {
      const size = mount(element, false);
      TestBed.tick();
      expect(size()).toEqual({ width: 0, height: 0 });
      globalThis.dispatchEvent(new Event('resize'));
      expect(size()).toEqual({ width: 0, height: 0 });
    });

    it('stays at {0,0} when container is null', () => {
      const size = mount(null);
      TestBed.tick();
      expect(size()).toEqual({ width: 0, height: 0 });
    });

    it('toggles subscription when the enabled signal flips', () => {
      const enabled = signal(false);
      const size = runInInjectionContext(injector, () =>
        containerSize(signal<HTMLElement | null | undefined>(element), enabled)
      );
      TestBed.tick();
      expect(size()).toEqual({ width: 0, height: 0 });

      enabled.set(true);
      TestBed.tick();
      expect(size()).toEqual({ width: 1024, height: 768 });
    });
  });

  describe('cleanup', () => {
    it('removes the resize listener when the container signal goes null', () => {
      const containerEl = signal<HTMLElement | null>(element);
      const size = runInInjectionContext(injector, () => containerSize(containerEl));
      TestBed.tick();
      expect(size()).toEqual({ width: 1024, height: 768 });

      containerEl.set(null);
      TestBed.tick();

      setWindowSize(500, 500);
      globalThis.dispatchEvent(new Event('resize'));
      expect(size()).toEqual({ width: 1024, height: 768 });
    });
  });

  describe('readonly contract', () => {
    it('returns a signal without set/update', () => {
      const size = mount();
      expect('set' in size).toBe(false);
      expect('update' in size).toBe(false);
    });
  });

  describe('injection context discipline', () => {
    it('throws outside injection context when no injector is passed', () => {
      expect(() => containerSize(signal(element))).toThrow();
    });

    it('accepts an explicit injector opt', () => {
      expect(() =>
        containerSize(signal<HTMLElement | null | undefined>(element), true, { injector })
      ).not.toThrow();
    });
  });
});

describe('containerSize (ResizeObserver path)', () => {
  let observerMock: { observe: jest.Mock; unobserve: jest.Mock; disconnect: jest.Mock };
  let resizeCallback: (entries: ResizeObserverEntry[]) => void;
  let injector: Injector;
  let originalRO: typeof globalThis.ResizeObserver | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    injector = TestBed.inject(Injector);
    observerMock = { observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn() };
    originalRO = globalThis.ResizeObserver;
    globalThis.ResizeObserver = jest.fn().mockImplementation((cb: typeof resizeCallback) => {
      resizeCallback = cb;
      return observerMock;
    }) as unknown as typeof globalThis.ResizeObserver;
  });

  afterEach(() => {
    jest.useRealTimers();
    if (originalRO) globalThis.ResizeObserver = originalRO;
    else delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
  });

  function entry(width: number, height: number, target: Element): ResizeObserverEntry {
    return { target, contentRect: { width, height } } as unknown as ResizeObserverEntry;
  }

  function mount(el: HTMLElement) {
    return runInInjectionContext(injector, () =>
      containerSize(signal<HTMLElement | null | undefined>(el))
    );
  }

  it('creates a ResizeObserver and observes the element', () => {
    const el = document.createElement('div');
    const size = mount(el);
    TestBed.tick();

    expect(globalThis.ResizeObserver).toHaveBeenCalledTimes(1);
    expect(observerMock.observe).toHaveBeenCalledWith(el);
    expect(size()).toEqual({ width: 0, height: 0 });
  });

  it('updates size from the entry contentRect after the throttle flushes', () => {
    const el = document.createElement('div');
    const size = mount(el);
    TestBed.tick();

    resizeCallback([entry(320, 200, el)]);
    jest.runAllTimers();

    expect(size()).toEqual({ width: 320, height: 200 });
  });

  it('coalesces multiple synchronous callbacks and keeps only the last', () => {
    const el = document.createElement('div');
    const size = mount(el);
    TestBed.tick();

    resizeCallback([entry(100, 100, el)]);
    resizeCallback([entry(200, 200, el)]);
    resizeCallback([entry(300, 300, el)]);
    jest.runAllTimers();

    expect(size()).toEqual({ width: 300, height: 300 });
  });

  it('keeps only the last entry when a single callback carries a batch', () => {
    const el = document.createElement('div');
    const size = mount(el);
    TestBed.tick();

    resizeCallback([entry(100, 100, el), entry(200, 200, el), entry(999, 999, el)]);
    jest.runAllTimers();

    expect(size()).toEqual({ width: 999, height: 999 });
  });

  it('disconnects the observer when the effect cleans up', () => {
    const container = signal<HTMLElement | null>(document.createElement('div'));
    runInInjectionContext(injector, () => containerSize(container));
    TestBed.tick();

    container.set(null);
    TestBed.tick();

    expect(observerMock.disconnect).toHaveBeenCalled();
  });
});
