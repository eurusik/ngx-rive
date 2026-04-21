import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { fireLoad, mockRiveInstance, resetMockRive, Rive } from '../__mocks__/rive-canvas.mock';
import { NgxRiveComponent } from './rive.component';

interface MockProp<T> {
  value: T;
  on: jest.Mock;
  off: jest.Mock;
  emit: () => void;
}
type AnyObj = Record<string, unknown>;

function makeProp<T>(initial: T): MockProp<T> {
  const listeners = new Set<() => void>();
  return {
    value: initial,
    on: jest.fn((cb: () => void) => listeners.add(cb)),
    off: jest.fn((cb: () => void) => listeners.delete(cb)),
    emit: () => listeners.forEach((cb) => cb()),
  };
}

function makeTriggerProp() {
  const listeners = new Set<() => void>();
  const trigger = jest.fn(() => listeners.forEach((cb) => cb()));
  return {
    trigger,
    on: jest.fn((cb: () => void) => listeners.add(cb)),
    off: jest.fn((cb: () => void) => listeners.delete(cb)),
  };
}

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
    emit: () => listeners.forEach((cb) => cb()),
  };
}

function makeEnumProp(initial: string, values: string[]) {
  const listeners = new Set<() => void>();
  return {
    value: initial,
    values,
    on: jest.fn((cb: () => void) => listeners.add(cb)),
    off: jest.fn((cb: () => void) => listeners.delete(cb)),
    emit: () => listeners.forEach((cb) => cb()),
  };
}

function installViewModel(config: {
  named?: Record<string, { instance?: AnyObj; named?: Record<string, AnyObj> }>;
  defaultInstance?: AnyObj;
}): void {
  const m = mockRiveInstance as unknown as AnyObj;
  m['viewModelInstance'] = null;
  m['bindViewModelInstance'] = jest.fn(function (this: AnyObj, inst: unknown) {
    this['viewModelInstance'] = inst;
  });

  const vm = {
    defaultInstance: jest.fn().mockReturnValue(config.defaultInstance ?? null),
    instance: jest.fn().mockReturnValue({ kind: 'new-instance' }),
    instanceByName: jest.fn(),
  };
  m['defaultViewModel'] = jest.fn().mockReturnValue(vm);
  m['viewModelByName'] = jest.fn((name: string) => {
    const entry = config.named?.[name];
    if (!entry) return null;
    return {
      defaultInstance: jest.fn().mockReturnValue(entry.instance ?? null),
      instance: jest.fn().mockReturnValue({ kind: 'new-instance' }),
      instanceByName: jest.fn((iname: string) => entry.named?.[iname] ?? null),
    };
  });
}

@Component({
  standalone: true,
  imports: [NgxRiveComponent],
  template: `<ngx-rive [src]="src"></ngx-rive>`,
})
class HostComponent {
  src = 'file.riv';
  @ViewChild(NgxRiveComponent) component!: NgxRiveComponent;
}

describe('ngx-rive integration', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    resetMockRive();
    (Rive as unknown as jest.Mock).mockClear();
    const m = mockRiveInstance as unknown as AnyObj;
    delete m['defaultViewModel'];
    delete m['viewModelByName'];
    delete m['bindViewModelInstance'];
    delete m['viewModelInstance'];

    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
  });

  async function boot(): Promise<void> {
    fixture.detectChanges();
    TestBed.tick();
    await fixture.whenStable();
    fireLoad();
    fixture.detectChanges();
    TestBed.tick();
  }

  describe('data binding — number', () => {
    it('reads, writes, and reacts to external changes', async () => {
      const scoreProp = makeProp(42);
      installViewModel({
        defaultInstance: { number: jest.fn().mockReturnValue(scoreProp) },
      });

      await boot();
      const binding = fixture.componentInstance.component.directive().bind();
      const score = binding.number('score');
      TestBed.tick();

      expect(score.value()).toBe(42);

      scoreProp.value = 99;
      scoreProp.emit();
      TestBed.tick();
      expect(score.value()).toBe(99);

      score.setValue(123);
      expect(scoreProp.value).toBe(123);
    });
  });

  describe('data binding — string', () => {
    it('round-trips a string value', async () => {
      const titleProp = makeProp('hello');
      installViewModel({
        defaultInstance: { string: jest.fn().mockReturnValue(titleProp) },
      });

      await boot();
      const title = fixture.componentInstance.component.directive().bind().string('title');
      TestBed.tick();

      expect(title.value()).toBe('hello');
      title.setValue('world');
      expect(titleProp.value).toBe('world');
    });
  });

  describe('data binding — enum', () => {
    it('exposes value and the values list', async () => {
      const shapeProp = makeEnumProp('triangle', ['triangle', 'square', 'circle']);
      installViewModel({
        defaultInstance: { enum: jest.fn().mockReturnValue(shapeProp) },
      });

      await boot();
      const shape = fixture.componentInstance.component.directive().bind().enum('shape');
      TestBed.tick();

      expect(shape.value()).toBe('triangle');
      expect(shape.values()).toEqual(['triangle', 'square', 'circle']);

      shape.setValue('square');
      expect(shapeProp.value).toBe('square');
    });
  });

  describe('data binding — trigger', () => {
    it('fires the underlying trigger and invokes onTrigger on emit', async () => {
      const tapProp = makeTriggerProp();
      installViewModel({
        defaultInstance: { trigger: jest.fn().mockReturnValue(tapProp) },
      });

      await boot();
      const onTrigger = jest.fn();
      const tap = fixture.componentInstance.component
        .directive()
        .bind()
        .trigger('tap', { onTrigger });
      TestBed.tick();

      tap.trigger();
      expect(tapProp.trigger).toHaveBeenCalledTimes(1);
      expect(onTrigger).toHaveBeenCalledTimes(1);
    });
  });

  describe('data binding — color', () => {
    it('exposes rgb/rgba/alpha/opacity helpers that forward to the prop', async () => {
      const colorProp = makeColorProp(0xff0000ff);
      installViewModel({
        defaultInstance: { color: jest.fn().mockReturnValue(colorProp) },
      });

      await boot();
      const color = fixture.componentInstance.component.directive().bind().color('brand');
      TestBed.tick();

      expect(color.value()).toBe(0xff0000ff);

      color.setRgb(1, 2, 3);
      color.setRgba(4, 5, 6, 7);
      color.setAlpha(128);
      color.setOpacity(0.5);

      expect(colorProp.rgb).toHaveBeenCalledWith(1, 2, 3);
      expect(colorProp.rgba).toHaveBeenCalledWith(4, 5, 6, 7);
      expect(colorProp.alpha).toHaveBeenCalledWith(128);
      expect(colorProp.opacity).toHaveBeenCalledWith(0.5);
    });
  });

  describe('auto-bind', () => {
    it('binds the resolved instance to Rive by default', async () => {
      const instance = { kind: 'default-vmi' };
      installViewModel({ defaultInstance: instance });

      await boot();
      fixture.componentInstance.component.directive().bind();
      TestBed.tick();

      const m = mockRiveInstance as unknown as AnyObj;
      expect(m['bindViewModelInstance']).toHaveBeenCalledWith(instance);
    });

    it('does not bind when autoBind: false', async () => {
      installViewModel({ defaultInstance: { kind: 'default-vmi' } });

      await boot();
      fixture.componentInstance.component.directive().bind({ autoBind: false });
      TestBed.tick();

      const m = mockRiveInstance as unknown as AnyObj;
      expect(m['bindViewModelInstance']).not.toHaveBeenCalled();
    });
  });

  describe('named view model / instance selection', () => {
    it('bind({ viewModel: "Dashboard" }) uses viewModelByName', async () => {
      const score = makeProp(10);
      installViewModel({
        named: {
          Dashboard: {
            instance: { number: jest.fn().mockReturnValue(score) },
          },
        },
      });

      await boot();
      const binding = fixture.componentInstance.component
        .directive()
        .bind({ viewModel: 'Dashboard' });
      const result = binding.number('score');
      TestBed.tick();

      const m = mockRiveInstance as unknown as AnyObj;
      expect(m['viewModelByName']).toHaveBeenCalledWith('Dashboard');
      expect(result.value()).toBe(10);
    });

    it('bind({ instance: { name: "Alt" } }) uses instanceByName', async () => {
      const altPrimitive = makeProp(7);
      installViewModel({
        named: {
          Dashboard: {
            named: { Alt: { number: jest.fn().mockReturnValue(altPrimitive) } },
          },
        },
      });

      await boot();
      const binding = fixture.componentInstance.component
        .directive()
        .bind({ viewModel: 'Dashboard', instance: { name: 'Alt' } });
      const result = binding.number('value');
      TestBed.tick();
      expect(result.value()).toBe(7);
    });

    it('bind({ instance: "new" }) creates a fresh instance from the view model', async () => {
      installViewModel({ defaultInstance: { kind: 'default-vmi' } });
      await boot();

      const binding = fixture.componentInstance.component
        .directive()
        .bind({ instance: 'new' });
      expect(binding.viewModelInstance()).toEqual({ kind: 'new-instance' });
    });
  });

  describe('state machine input via directive', () => {
    it('resolves input and applies initialValue on load', async () => {
      const speedInput = { name: 'speed', value: 0 };
      mockRiveInstance.stateMachineInputs = jest.fn().mockReturnValue([speedInput]);

      await boot();
      const speed = fixture.componentInstance.component
        .directive()
        .stateMachineInput('SM1', 'speed', 42);
      TestBed.tick();

      expect(speed()).toBe(speedInput);
      expect(speedInput.value).toBe(42);
    });

    it('returns null after the underlying Rive is swapped out', async () => {
      const speedInput = { name: 'speed', value: 0 };
      mockRiveInstance.stateMachineInputs = jest.fn().mockReturnValue([speedInput]);

      await boot();
      const dir = fixture.componentInstance.component.directive();
      const speed = dir.stateMachineInput('SM1', 'speed');
      TestBed.tick();
      expect(speed()).toBe(speedInput);

      const host = fixture.componentInstance;
      host.src = '';
      fixture.detectChanges();
      TestBed.tick();
      await fixture.whenStable();

      expect(speed()).toBeNull();
    });
  });

  describe('caching across the chain', () => {
    it('bind() with identical params returns the same binding, and properties are stable', async () => {
      const scoreProp = makeProp(1);
      installViewModel({
        defaultInstance: { number: jest.fn().mockReturnValue(scoreProp) },
      });

      await boot();
      const dir = fixture.componentInstance.component.directive();
      const a = dir.bind();
      const b = dir.bind();
      expect(a).toBe(b);

      const p1 = a.number('score');
      const p2 = b.number('score');
      expect(p1).toBe(p2);
    });
  });

  describe('teardown propagation', () => {
    it('destroying the host cleans up Rive and stops emitting into bindings', async () => {
      const scoreProp = makeProp(5);
      installViewModel({
        defaultInstance: { number: jest.fn().mockReturnValue(scoreProp) },
      });

      await boot();
      const score = fixture.componentInstance.component.directive().bind().number('score');
      TestBed.tick();
      expect(score.value()).toBe(5);

      fixture.destroy();
      expect(mockRiveInstance.cleanup).toHaveBeenCalled();

      scoreProp.value = 999;
      scoreProp.emit();
      expect(score.value()).toBe(5);
    });
  });
});
