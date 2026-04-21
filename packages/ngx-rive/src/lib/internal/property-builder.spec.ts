import { Injector, WritableSignal, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ViewModelInstance } from '@rive-app/canvas';
import { createViewModelInstanceProperty } from './property-builder';

interface MockProp<V> {
  value: V;
  on: jest.Mock;
  off: jest.Mock;
  emit: () => void;
}

function makeProp<V>(initial: V): MockProp<V> {
  const listeners = new Set<() => void>();
  return {
    value: initial,
    on: jest.fn((cb: () => void) => listeners.add(cb)),
    off: jest.fn((cb: () => void) => listeners.delete(cb)),
    emit: () => listeners.forEach((cb) => cb()),
  };
}

type NumberProp = MockProp<number>;
type Ops = { setValue: (v: number) => void };

type GetPropertyFn = (vm: ViewModelInstance, path: string) => NumberProp | null;

function numberOptions(getPropertyFn: GetPropertyFn | jest.Mock) {
  return {
    getProperty: getPropertyFn as GetPropertyFn,
    getValue: (p: NumberProp) => p.value,
    defaultValue: 0,
    buildPropertyOperations: (safeAccess: (cb: (p: NumberProp) => void) => void): Ops => ({
      setValue: (v: number) => safeAccess((p) => {
        p.value = v;
      }),
    }),
  };
}

describe('createViewModelInstanceProperty', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = TestBed.inject(Injector);
  });

  function build(
    vmi: WritableSignal<ViewModelInstance | null | undefined>,
    path: string,
    prop: NumberProp,
    getPropertyFn: jest.Mock = jest.fn(() => prop)
  ) {
    return runInInjectionContext(injector, () =>
      createViewModelInstanceProperty<any, number, Ops>(
        path,
        vmi,
        numberOptions(getPropertyFn)
      )
    );
  }

  describe('initial state', () => {
    it('returns defaultValue before the vmi resolves', () => {
      const vmi = signal<ViewModelInstance | null | undefined>(null);
      const prop = makeProp(42);
      const ref = build(vmi, 'score', prop);
      expect(ref.value()).toBe(0);
    });

    it('syncs to getValue(prop) once the vmi is available', () => {
      const vmi = signal<ViewModelInstance | null | undefined>(null);
      const prop = makeProp(42);
      const ref = build(vmi, 'score', prop);

      vmi.set({} as ViewModelInstance);
      TestBed.tick();
      expect(ref.value()).toBe(42);
    });
  });

  describe('external change propagation', () => {
    it('updates value when prop emits', () => {
      const vmi = signal<ViewModelInstance | null | undefined>({} as ViewModelInstance);
      const prop = makeProp(1);
      const ref = build(vmi, 'score', prop);
      TestBed.tick();

      prop.value = 99;
      prop.emit();
      TestBed.tick();
      expect(ref.value()).toBe(99);
    });

    it('subscribes via prop.on and unsubscribes via prop.off on effect cleanup', () => {
      const vmi = signal<ViewModelInstance | null | undefined>({} as ViewModelInstance);
      const prop = makeProp(1);
      build(vmi, 'score', prop);
      TestBed.tick();

      expect(prop.on).toHaveBeenCalledTimes(1);

      vmi.set(null);
      TestBed.tick();
      expect(prop.off).toHaveBeenCalledTimes(1);
    });

    it('invokes onPropertyEvent on each emission', () => {
      const onPropertyEvent = jest.fn();
      const vmi = signal<ViewModelInstance | null | undefined>({} as ViewModelInstance);
      const prop = makeProp(1);
      runInInjectionContext(injector, () =>
        createViewModelInstanceProperty<any, number, Ops>('score', vmi, {
          ...numberOptions(jest.fn(() => prop)),
          onPropertyEvent,
        })
      );
      TestBed.tick();

      prop.emit();
      prop.emit();
      expect(onPropertyEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('guards', () => {
    it('resets to defaultValue when vmi goes null after being set', () => {
      const vmi = signal<ViewModelInstance | null | undefined>({} as ViewModelInstance);
      const prop = makeProp(50);
      const ref = build(vmi, 'score', prop);
      TestBed.tick();
      expect(ref.value()).toBe(50);

      vmi.set(null);
      TestBed.tick();
      expect(ref.value()).toBe(0);
    });

    it('does not subscribe when path is empty', () => {
      const vmi = signal<ViewModelInstance | null | undefined>({} as ViewModelInstance);
      const prop = makeProp(1);
      build(vmi, '', prop);
      TestBed.tick();
      expect(prop.on).not.toHaveBeenCalled();
    });

    it('does not subscribe when getProperty returns null', () => {
      const vmi = signal<ViewModelInstance | null | undefined>({} as ViewModelInstance);
      const prop = makeProp(1);
      const ref = build(vmi, 'missing', prop, jest.fn(() => null));
      TestBed.tick();
      expect(prop.on).not.toHaveBeenCalled();
      expect(ref.value()).toBe(0);
    });
  });

  describe('path / vmi reactivity', () => {
    it('re-resolves property when vmi changes to a different instance', () => {
      const vmi = signal<ViewModelInstance | null | undefined>(null);
      const propA = makeProp(10);
      const propB = makeProp(20);
      const getProperty = jest.fn((vm: ViewModelInstance) =>
        vm === instanceA ? propA : propB
      );
      const instanceA = { id: 'a' } as unknown as ViewModelInstance;
      const instanceB = { id: 'b' } as unknown as ViewModelInstance;

      const ref = build(vmi, 'score', propA, getProperty);
      vmi.set(instanceA);
      TestBed.tick();
      expect(ref.value()).toBe(10);

      vmi.set(instanceB);
      TestBed.tick();
      expect(ref.value()).toBe(20);
      expect(propA.off).toHaveBeenCalled();
      expect(propB.on).toHaveBeenCalled();
    });

    it('re-resolves when a signal-valued path changes', () => {
      const vmi = signal<ViewModelInstance | null | undefined>({} as ViewModelInstance);
      const propA = makeProp(7);
      const propB = makeProp(13);
      const getProperty = jest.fn((_vm: ViewModelInstance, p: string) =>
        p === 'a' ? propA : propB
      );
      const path = signal('a');
      const ref = runInInjectionContext(injector, () =>
        createViewModelInstanceProperty<any, number, Ops>(
          path,
          vmi,
          numberOptions(getProperty)
        )
      );
      TestBed.tick();
      expect(ref.value()).toBe(7);

      path.set('b');
      TestBed.tick();
      expect(ref.value()).toBe(13);
    });
  });

  describe('safeAccess (setter)', () => {
    it('uses the cached property for the fast path', () => {
      const vmi = signal<ViewModelInstance | null | undefined>({} as ViewModelInstance);
      const prop = makeProp(1);
      const getProperty = jest.fn(() => prop);
      const ref = build(vmi, 'score', prop, getProperty);
      TestBed.tick();
      getProperty.mockClear();

      ref.setValue(42);
      expect(prop.value).toBe(42);
      expect(getProperty).not.toHaveBeenCalled();
    });

    it('falls back to fresh-fetch when the cached property throws', () => {
      const vmi = signal<ViewModelInstance | null | undefined>({} as ViewModelInstance);
      const stale = { value: 0 } as NumberProp;
      const fresh = makeProp(0);
      const getProperty = jest.fn<NumberProp, []>();
      getProperty.mockReturnValueOnce(stale).mockReturnValueOnce(fresh);
      const ref = build(vmi, 'score', stale, getProperty);
      TestBed.tick();

      Object.defineProperty(stale, 'value', {
        set: () => {
          throw new Error('stale');
        },
        configurable: true,
      });

      ref.setValue(77);
      expect(fresh.value).toBe(77);
    });

    it('is a no-op when vmi is null', () => {
      const vmi = signal<ViewModelInstance | null | undefined>({} as ViewModelInstance);
      const prop = makeProp(1);
      const ref = build(vmi, 'score', prop);
      TestBed.tick();

      vmi.set(null);
      TestBed.tick();
      expect(() => ref.setValue(5)).not.toThrow();
    });

    it('silently swallows getProperty errors in the fresh-fetch path', () => {
      const vmi = signal<ViewModelInstance | null | undefined>({} as ViewModelInstance);
      const prop = makeProp(1);
      const getProperty = jest.fn(() => prop);
      const ref = build(vmi, 'score', prop, getProperty);
      TestBed.tick();

      Object.defineProperty(prop, 'value', {
        set: () => {
          throw new Error('cached write failed');
        },
        configurable: true,
      });
      getProperty.mockImplementation(() => {
        throw new Error('reload in progress');
      });

      expect(() => ref.setValue(9)).not.toThrow();
    });
  });

  describe('extended data', () => {
    it('exposes an extendedData signal when getExtendedData is supplied', () => {
      const vmi = signal<ViewModelInstance | null | undefined>({} as ViewModelInstance);
      const prop = { value: 'one', values: ['one', 'two'], on: jest.fn(), off: jest.fn() };

      const ref = runInInjectionContext(injector, () =>
        createViewModelInstanceProperty<any, string, { set: (v: string) => void }, string[]>(
          'shape',
          vmi,
          {
            getProperty: () => prop,
            getValue: (p: typeof prop) => p.value,
            defaultValue: null,
            getExtendedData: (p: typeof prop) => p.values,
            buildPropertyOperations: (safeAccess) => ({
              set: (v: string) => safeAccess((p: typeof prop) => {
                p.value = v;
              }),
            }),
          }
        )
      );
      TestBed.tick();

      expect(ref.value()).toBe('one');
      expect(ref.extendedData()).toEqual(['one', 'two']);
    });

    it('does not expose extendedData when getExtendedData is absent', () => {
      const vmi = signal<ViewModelInstance | null | undefined>({} as ViewModelInstance);
      const prop = makeProp(1);
      const ref = build(vmi, 'score', prop);
      expect('extendedData' in ref).toBe(false);
    });
  });

  describe('resilience', () => {
    it('does not crash when prop.on throws', () => {
      const vmi = signal<ViewModelInstance | null | undefined>({} as ViewModelInstance);
      const prop = makeProp(5);
      prop.on.mockImplementation(() => {
        throw new Error('no on() here');
      });

      expect(() => {
        const ref = build(vmi, 'score', prop);
        TestBed.tick();
        expect(ref.value()).toBe(5);
      }).not.toThrow();
    });

    it('does not crash when prop.off throws on cleanup', () => {
      const vmi = signal<ViewModelInstance | null | undefined>({} as ViewModelInstance);
      const prop = makeProp(5);
      prop.off.mockImplementation(() => {
        throw new Error('no off() here');
      });
      build(vmi, 'score', prop);
      TestBed.tick();

      expect(() => {
        vmi.set(null);
        TestBed.tick();
      }).not.toThrow();
    });
  });

  describe('injection context discipline', () => {
    it('throws outside an injection context without an injector opt', () => {
      const vmi = signal<ViewModelInstance | null | undefined>({} as ViewModelInstance);
      expect(() =>
        createViewModelInstanceProperty<any, number, Ops>(
          'score',
          vmi,
          numberOptions(jest.fn())
        )
      ).toThrow();
    });

    it('accepts an explicit injector opt', () => {
      const vmi = signal<ViewModelInstance | null | undefined>({} as ViewModelInstance);
      const prop = makeProp(1);
      expect(() =>
        createViewModelInstanceProperty<any, number, Ops>(
          'score',
          vmi,
          numberOptions(jest.fn(() => prop)),
          { injector }
        )
      ).not.toThrow();
    });
  });
});
