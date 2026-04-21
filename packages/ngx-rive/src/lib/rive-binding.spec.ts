import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NgxRiveBinding } from './rive-binding';

type Listener = () => void;

function mkProperty<T>(initial: T) {
  const listeners = new Set<Listener>();
  const prop = {
    value: initial,
    on: jest.fn((cb: Listener) => listeners.add(cb)),
    off: jest.fn((cb: Listener) => listeners.delete(cb)),
    __emit: () => listeners.forEach((cb) => cb()),
  };
  return prop;
}

describe('NgxRiveBinding', () => {
  let injector: Injector;

  beforeEach(() => {
    injector = TestBed.inject(Injector);
  });

  it('returns null signals until Rive is available', () => {
    runInInjectionContext(injector, () => {
      const rive = signal<any>(null);
      const binding = new NgxRiveBinding({ rive }, {}, injector);
      expect(binding.viewModel()).toBeNull();
      expect(binding.viewModelInstance()).toBeNull();
    });
  });

  it('reads default view model and instance by default', () => {
    runInInjectionContext(injector, () => {
      const viewModel = { defaultInstance: jest.fn().mockReturnValue({ id: 'vmi' }) };
      const rive = signal<any>({
        defaultViewModel: jest.fn().mockReturnValue(viewModel),
        bindViewModelInstance: jest.fn(),
        viewModelInstance: null,
      });
      const binding = new NgxRiveBinding({ rive }, {}, injector);
      expect(binding.viewModel()).toBe(viewModel);
      expect(binding.viewModelInstance()).toEqual({ id: 'vmi' });
      // autoBind now lives in an effect — flush so it fires.
      TestBed.tick();
      expect(rive().bindViewModelInstance).toHaveBeenCalled();
    });
  });

  it('number() exposes a reactive value and setValue mutates', () => {
    runInInjectionContext(injector, () => {
      const prop = mkProperty(10);
      const vmi = { number: jest.fn().mockReturnValue(prop) };
      const vm = { defaultInstance: jest.fn().mockReturnValue(vmi) };
      const rive = signal<any>({
        defaultViewModel: () => vm,
        bindViewModelInstance: jest.fn(),
        viewModelInstance: null,
      });
      const binding = new NgxRiveBinding({ rive }, {}, injector);
      const ref = binding.number('counter');
      TestBed.tick();
      expect(ref.value()).toBe(10);

      ref.setValue(42);
      expect(prop.value).toBe(42);
    });
  });

  it('caches property refs by path + type', () => {
    runInInjectionContext(injector, () => {
      const vmi = { number: jest.fn().mockReturnValue(mkProperty(0)) };
      const vm = { defaultInstance: jest.fn().mockReturnValue(vmi) };
      const rive = signal<any>({
        defaultViewModel: () => vm,
        bindViewModelInstance: jest.fn(),
        viewModelInstance: null,
      });
      const binding = new NgxRiveBinding({ rive }, {}, injector);
      const a = binding.number('x');
      const b = binding.number('x');
      expect(a).toBe(b);
    });
  });

  it('exposes enum values via a signal', () => {
    runInInjectionContext(injector, () => {
      const prop = { value: 'triangle', values: ['triangle', 'square'], on: jest.fn(), off: jest.fn() };
      const vmi = { enum: jest.fn().mockReturnValue(prop) };
      const vm = { defaultInstance: jest.fn().mockReturnValue(vmi) };
      const rive = signal<any>({
        defaultViewModel: () => vm,
        bindViewModelInstance: jest.fn(),
        viewModelInstance: null,
      });
      const binding = new NgxRiveBinding({ rive }, {}, injector);
      const ref = binding.enum('logoShape');
      TestBed.tick();
      expect(ref.value()).toBe('triangle');
      expect(ref.values()).toEqual(['triangle', 'square']);
    });
  });

  it('color setters call the underlying property methods', () => {
    runInInjectionContext(injector, () => {
      const prop = {
        value: 0xff0000ff,
        rgb: jest.fn(),
        rgba: jest.fn(),
        alpha: jest.fn(),
        opacity: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
      };
      const vmi = { color: jest.fn().mockReturnValue(prop) };
      const vm = { defaultInstance: jest.fn().mockReturnValue(vmi) };
      const rive = signal<any>({
        defaultViewModel: () => vm,
        bindViewModelInstance: jest.fn(),
        viewModelInstance: null,
      });
      const binding = new NgxRiveBinding({ rive }, {}, injector);
      const ref = binding.color('rootColor');
      TestBed.tick();

      ref.setRgb(1, 2, 3);
      ref.setRgba(4, 5, 6, 7);
      ref.setAlpha(8);
      ref.setOpacity(0.5);

      expect(prop.rgb).toHaveBeenCalledWith(1, 2, 3);
      expect(prop.rgba).toHaveBeenCalledWith(4, 5, 6, 7);
      expect(prop.alpha).toHaveBeenCalledWith(8);
      expect(prop.opacity).toHaveBeenCalledWith(0.5);
    });
  });

  it('updates the value signal when the property emits a change', () => {
    runInInjectionContext(injector, () => {
      const prop = mkProperty(10);
      const vmi = { number: jest.fn().mockReturnValue(prop) };
      const vm = { defaultInstance: jest.fn().mockReturnValue(vmi) };
      const rive = signal<any>({
        defaultViewModel: () => vm,
        bindViewModelInstance: jest.fn(),
        viewModelInstance: null,
      });
      const binding = new NgxRiveBinding({ rive }, {}, injector);
      const ref = binding.number('x');
      TestBed.tick();
      expect(ref.value()).toBe(10);

      prop.value = 25;
      prop.__emit();
      TestBed.tick();
      expect(ref.value()).toBe(25);
    });
  });
});
