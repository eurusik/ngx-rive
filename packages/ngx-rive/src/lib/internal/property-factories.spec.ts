import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ViewModelInstance } from '@rive-app/canvas';
import {
  buildArtboard,
  buildBoolean,
  buildColor,
  buildEnum,
  buildImage,
  buildList,
  buildNumber,
  buildString,
  buildTrigger,
} from './property-factories';

interface EmittableProp<V> {
  value: V;
  on: jest.Mock;
  off: jest.Mock;
  emit: () => void;
}

function makeProp<V>(initial: V): EmittableProp<V> {
  const listeners = new Set<() => void>();
  return {
    value: initial,
    on: jest.fn((cb: () => void) => listeners.add(cb)),
    off: jest.fn((cb: () => void) => listeners.delete(cb)),
    emit: () => listeners.forEach((cb) => cb()),
  };
}

function vmiFor(props: Record<string, unknown>): ViewModelInstance {
  return props as unknown as ViewModelInstance;
}

describe('property-factories', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = TestBed.inject(Injector);
  });

  describe('buildNumber', () => {
    it('exposes initial value, reacts to emit, and mutates via setValue', () => {
      const prop = makeProp(10);
      const vmi = signal<ViewModelInstance | null | undefined>(
        vmiFor({ number: jest.fn().mockReturnValue(prop) })
      );
      const ref = buildNumber('score', vmi, { injector });
      TestBed.tick();

      expect(ref.value()).toBe(10);

      prop.value = 25;
      prop.emit();
      TestBed.tick();
      expect(ref.value()).toBe(25);

      ref.setValue(42);
      expect(prop.value).toBe(42);
    });
  });

  describe('buildString', () => {
    it('exposes initial string and writes via setValue', () => {
      const prop = makeProp('hello');
      const vmi = signal<ViewModelInstance | null | undefined>(
        vmiFor({ string: jest.fn().mockReturnValue(prop) })
      );
      const ref = buildString('title', vmi, { injector });
      TestBed.tick();

      expect(ref.value()).toBe('hello');
      ref.setValue('world');
      expect(prop.value).toBe('world');
    });
  });

  describe('buildBoolean', () => {
    it('exposes initial boolean and toggles via setValue', () => {
      const prop = makeProp(false);
      const vmi = signal<ViewModelInstance | null | undefined>(
        vmiFor({ boolean: jest.fn().mockReturnValue(prop) })
      );
      const ref = buildBoolean('active', vmi, { injector });
      TestBed.tick();

      expect(ref.value()).toBe(false);
      ref.setValue(true);
      expect(prop.value).toBe(true);
    });
  });

  describe('buildColor', () => {
    function makeColorProp(initial: number) {
      const listeners = new Set<() => void>();
      return {
        value: initial,
        rgb: jest.fn(),
        rgba: jest.fn(),
        alpha: jest.fn(),
        opacity: jest.fn(),
        on: jest.fn((cb: () => void) => listeners.add(cb)),
        off: jest.fn((cb: () => void) => listeners.delete(cb)),
      };
    }

    it('exposes value + setValue', () => {
      const prop = makeColorProp(0xff0000ff);
      const vmi = signal<ViewModelInstance | null | undefined>(
        vmiFor({ color: jest.fn().mockReturnValue(prop) })
      );
      const ref = buildColor('brand', vmi, { injector });
      TestBed.tick();

      expect(ref.value()).toBe(0xff0000ff);
      ref.setValue(0x00ff00ff);
      expect(prop.value).toBe(0x00ff00ff);
    });

    it('forwards setRgb / setRgba / setAlpha / setOpacity to the prop methods', () => {
      const prop = makeColorProp(0);
      const vmi = signal<ViewModelInstance | null | undefined>(
        vmiFor({ color: jest.fn().mockReturnValue(prop) })
      );
      const ref = buildColor('brand', vmi, { injector });
      TestBed.tick();

      ref.setRgb(1, 2, 3);
      ref.setRgba(4, 5, 6, 7);
      ref.setAlpha(128);
      ref.setOpacity(0.5);

      expect(prop.rgb).toHaveBeenCalledWith(1, 2, 3);
      expect(prop.rgba).toHaveBeenCalledWith(4, 5, 6, 7);
      expect(prop.alpha).toHaveBeenCalledWith(128);
      expect(prop.opacity).toHaveBeenCalledWith(0.5);
    });
  });

  describe('buildEnum', () => {
    function makeEnumProp(initial: string, values: string[]) {
      const listeners = new Set<() => void>();
      return {
        value: initial,
        values,
        on: jest.fn((cb: () => void) => listeners.add(cb)),
        off: jest.fn((cb: () => void) => listeners.delete(cb)),
      };
    }

    it('exposes value + setValue', () => {
      const prop = makeEnumProp('triangle', ['triangle', 'square']);
      const vmi = signal<ViewModelInstance | null | undefined>(
        vmiFor({ enum: jest.fn().mockReturnValue(prop) })
      );
      const ref = buildEnum('shape', vmi, { injector });
      TestBed.tick();

      expect(ref.value()).toBe('triangle');
      ref.setValue('square');
      expect(prop.value).toBe('square');
    });

    it('exposes values list from the underlying prop', () => {
      const prop = makeEnumProp('one', ['one', 'two', 'three']);
      const vmi = signal<ViewModelInstance | null | undefined>(
        vmiFor({ enum: jest.fn().mockReturnValue(prop) })
      );
      const ref = runInInjectionContext(injector, () => buildEnum('x', vmi, { injector }));
      TestBed.tick();

      expect(ref.values()).toEqual(['one', 'two', 'three']);
    });

    it('values signal returns [] before the property is resolved', () => {
      const vmi = signal<ViewModelInstance | null | undefined>(null);
      const ref = runInInjectionContext(injector, () => buildEnum('x', vmi, { injector }));
      expect(ref.values()).toEqual([]);
    });
  });

  describe('buildTrigger', () => {
    it('calls prop.trigger() when trigger() is invoked', () => {
      const prop = {
        trigger: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
      };
      const vmi = signal<ViewModelInstance | null | undefined>(
        vmiFor({ trigger: jest.fn().mockReturnValue(prop) })
      );
      const ref = buildTrigger('tap', vmi, { injector });
      TestBed.tick();

      ref.trigger();
      expect(prop.trigger).toHaveBeenCalledTimes(1);
    });

    it('invokes onTrigger callback when the prop emits', () => {
      const listeners = new Set<() => void>();
      const prop = {
        trigger: jest.fn(),
        on: jest.fn((cb: () => void) => listeners.add(cb)),
        off: jest.fn(),
      };
      const vmi = signal<ViewModelInstance | null | undefined>(
        vmiFor({ trigger: jest.fn().mockReturnValue(prop) })
      );
      const onTrigger = jest.fn();
      buildTrigger('tap', vmi, { injector }, { onTrigger });
      TestBed.tick();

      listeners.forEach((cb) => cb());
      expect(onTrigger).toHaveBeenCalledTimes(1);
    });
  });

  describe('buildImage', () => {
    it('forwards setValue with the provided image', () => {
      const prop = { value: null as unknown, on: jest.fn(), off: jest.fn() };
      const vmi = signal<ViewModelInstance | null | undefined>(
        vmiFor({ image: jest.fn().mockReturnValue(prop) })
      );
      const ref = buildImage('bg', vmi, { injector });
      TestBed.tick();

      const image = { _kind: 'RiveRenderImage' };
      ref.setValue(image as unknown as Parameters<typeof ref.setValue>[0]);
      expect(prop.value).toBe(image);
    });
  });

  describe('buildList', () => {
    function makeListProp(length: number) {
      const listeners = new Set<() => void>();
      return {
        length,
        addInstance: jest.fn(),
        addInstanceAt: jest.fn().mockReturnValue(true),
        removeInstance: jest.fn(),
        removeInstanceAt: jest.fn(),
        instanceAt: jest.fn(),
        swap: jest.fn(),
        on: jest.fn((cb: () => void) => listeners.add(cb)),
        off: jest.fn((cb: () => void) => listeners.delete(cb)),
        emit: () => listeners.forEach((cb) => cb()),
      };
    }

    it('exposes length signal matching prop.length', () => {
      const prop = makeListProp(3);
      const vmi = signal<ViewModelInstance | null | undefined>(
        vmiFor({ list: jest.fn().mockReturnValue(prop) })
      );
      const ref = runInInjectionContext(injector, () => buildList('items', vmi, { injector }));
      TestBed.tick();
      expect(ref.length()).toBe(3);

      prop.length = 7;
      prop.emit();
      TestBed.tick();
      expect(ref.length()).toBe(7);
    });

    it('length signal is 0 before the prop resolves', () => {
      const vmi = signal<ViewModelInstance | null | undefined>(null);
      const ref = runInInjectionContext(injector, () => buildList('items', vmi, { injector }));
      expect(ref.length()).toBe(0);
    });

    it('version signal ticks on every mutation, including swaps with stable length', () => {
      const prop = makeListProp(3);
      const vmi = signal<ViewModelInstance | null | undefined>(
        vmiFor({ list: jest.fn().mockReturnValue(prop) })
      );
      const ref = runInInjectionContext(injector, () => buildList('items', vmi, { injector }));
      TestBed.tick();

      const v0 = ref.version();

      // Simulate a swap: length stays at 3, but Rive still emits prop.on().
      prop.emit();
      TestBed.tick();
      const v1 = ref.version();
      expect(v1).toBeGreaterThan(v0);

      // Another silent mutation → version keeps advancing.
      prop.emit();
      TestBed.tick();
      expect(ref.version()).toBeGreaterThan(v1);
    });

    it('version signal is 0 before the prop resolves', () => {
      const vmi = signal<ViewModelInstance | null | undefined>(null);
      const ref = runInInjectionContext(injector, () => buildList('items', vmi, { injector }));
      expect(ref.version()).toBe(0);
    });

    it('addInstance / removeInstance / removeInstanceAt / swap delegate to prop', () => {
      const prop = makeListProp(0);
      const vmi = signal<ViewModelInstance | null | undefined>(
        vmiFor({ list: jest.fn().mockReturnValue(prop) })
      );
      const ref = runInInjectionContext(injector, () => buildList('items', vmi, { injector }));
      TestBed.tick();

      const child = {} as ViewModelInstance;
      ref.addInstance(child);
      ref.removeInstance(child);
      ref.removeInstanceAt(2);
      ref.swap(0, 1);

      expect(prop.addInstance).toHaveBeenCalledWith(child);
      expect(prop.removeInstance).toHaveBeenCalledWith(child);
      expect(prop.removeInstanceAt).toHaveBeenCalledWith(2);
      expect(prop.swap).toHaveBeenCalledWith(0, 1);
    });

    it('addInstanceAt returns the prop result and falls back to false on unresolved vmi', () => {
      const prop = makeListProp(0);
      const vmi = signal<ViewModelInstance | null | undefined>(
        vmiFor({ list: jest.fn().mockReturnValue(prop) })
      );
      const ref = runInInjectionContext(injector, () => buildList('items', vmi, { injector }));
      TestBed.tick();

      const child = {} as ViewModelInstance;
      prop.addInstanceAt.mockReturnValueOnce(true);
      expect(ref.addInstanceAt(child, 1)).toBe(true);

      vmi.set(null);
      TestBed.tick();
      expect(ref.addInstanceAt(child, 1)).toBe(false);
    });

    it('getInstanceAt returns the prop result and falls back to null on unresolved vmi', () => {
      const prop = makeListProp(0);
      const found = {} as ViewModelInstance;
      prop.instanceAt.mockReturnValue(found);
      const vmi = signal<ViewModelInstance | null | undefined>(
        vmiFor({ list: jest.fn().mockReturnValue(prop) })
      );
      const ref = runInInjectionContext(injector, () => buildList('items', vmi, { injector }));
      TestBed.tick();

      expect(ref.getInstanceAt(0)).toBe(found);

      vmi.set(null);
      TestBed.tick();
      expect(ref.getInstanceAt(0)).toBeNull();
    });
  });

  describe('buildArtboard', () => {
    it('forwards setValue to prop.value', () => {
      const prop = { value: null as unknown, on: jest.fn(), off: jest.fn() };
      const vmi = signal<ViewModelInstance | null | undefined>(
        vmiFor({ artboard: jest.fn().mockReturnValue(prop) })
      );
      const ref = buildArtboard('slot', vmi, { injector });
      TestBed.tick();

      const child = { _kind: 'Artboard' };
      ref.setValue(child as unknown as Parameters<typeof ref.setValue>[0]);
      expect(prop.value).toBe(child);
    });
  });
});
