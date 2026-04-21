import { Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  fireLoad,
  fireLoadError,
  mockRiveInstance,
  resetMockRive,
  Rive,
} from '../__mocks__/rive-canvas.mock';
import { NgxRiveDirective } from './rive.directive';

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

function installDefaultViewModel(properties: AnyObj): void {
  const m = mockRiveInstance as unknown as AnyObj;
  m['viewModelInstance'] = null;
  m['bindViewModelInstance'] = jest.fn(function (this: AnyObj, inst: unknown) {
    this['viewModelInstance'] = inst;
  });
  m['defaultViewModel'] = jest.fn().mockReturnValue({
    defaultInstance: jest.fn().mockReturnValue(properties),
    instance: jest.fn(),
    instanceByName: jest.fn(),
  });
}

function clearViewModelMock(): void {
  const m = mockRiveInstance as unknown as AnyObj;
  delete m['defaultViewModel'];
  delete m['viewModelByName'];
  delete m['bindViewModelInstance'];
  delete m['viewModelInstance'];
}

@Component({
  standalone: true,
  imports: [NgxRiveDirective],
  template: `<canvas
    ngxRive
    [src]="src"
    [animations]="animations"
    [shouldUseIntersectionObserver]="useIO"
    #dir="ngxRive"
  ></canvas>`,
})
class HostComponent {
  src: string | undefined = undefined;
  animations: string | string[] | undefined = undefined;
  useIO = true;
  readonly dir = viewChild.required(NgxRiveDirective);
}

describe('NgxRiveDirective integration', () => {
  let fixture: ComponentFixture<HostComponent>;
  let ioMock: { observe: jest.Mock; unobserve: jest.Mock; disconnect: jest.Mock };
  let ioCallback: (entries: IntersectionObserverEntry[]) => void;
  let originalIO: typeof IntersectionObserver | undefined;

  beforeEach(() => {
    resetMockRive();
    (Rive as unknown as jest.Mock).mockClear();
    clearViewModelMock();
    mockRiveInstance.isPlaying = false;
    mockRiveInstance.isPaused = false;

    ioMock = { observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn() };
    originalIO = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = jest.fn().mockImplementation((cb: typeof ioCallback) => {
      ioCallback = cb;
      return ioMock;
    }) as unknown as typeof IntersectionObserver;

    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
  });

  afterEach(() => {
    if (originalIO) globalThis.IntersectionObserver = originalIO;
  });

  async function load(src = 'file.riv'): Promise<void> {
    fixture.componentInstance.src = src;
    fixture.detectChanges();
    TestBed.tick();
    await fixture.whenStable();
    fireLoad();
    fixture.detectChanges();
    TestBed.tick();
  }

  describe('end-to-end playground flow', () => {
    it('mounts, loads, binds, and mutates a property', async () => {
      const score = makeProp(10);
      installDefaultViewModel({ number: jest.fn().mockReturnValue(score) });

      fixture.detectChanges();
      await load();

      const dir = fixture.componentInstance.dir();
      const scoreRef = dir.bind().number('score');
      TestBed.tick();

      expect(scoreRef.value()).toBe(10);

      score.value = 85;
      score.emit();
      TestBed.tick();
      expect(scoreRef.value()).toBe(85);

      scoreRef.setValue(100);
      expect(score.value).toBe(100);
    });
  });

  describe('src swap lifecycle', () => {
    it('tears down the previous instance and re-constructs on new src', async () => {
      fixture.detectChanges();
      await load('one.riv');
      expect((Rive as unknown as jest.Mock)).toHaveBeenCalledTimes(1);

      await load('two.riv');
      expect((Rive as unknown as jest.Mock)).toHaveBeenCalledTimes(2);
      expect(mockRiveInstance.cleanup).toHaveBeenCalled();
    });

    it('re-registers the intersection observer after src swap', async () => {
      fixture.detectChanges();
      await load('one.riv');
      expect(ioMock.observe).toHaveBeenCalledTimes(1);
      const canvas = fixture.componentInstance.dir().canvas;

      ioMock.observe.mockClear();
      ioMock.unobserve.mockClear();

      await load('two.riv');
      expect(ioMock.unobserve).toHaveBeenCalledWith(canvas);
      expect(ioMock.observe).toHaveBeenCalledWith(canvas);
    });
  });

  describe('subsystem coordination', () => {
    it('keeps data binding signals updating while intersection has paused rendering', async () => {
      const score = makeProp(1);
      installDefaultViewModel({ number: jest.fn().mockReturnValue(score) });

      fixture.detectChanges();
      await load();
      const dir = fixture.componentInstance.dir();
      const scoreRef = dir.bind().number('score');
      TestBed.tick();

      ioCallback([
        {
          target: dir.canvas,
          isIntersecting: false,
          boundingClientRect: { width: 10 },
        } as unknown as IntersectionObserverEntry,
      ]);
      expect(mockRiveInstance.stopRendering).toHaveBeenCalled();

      score.value = 42;
      score.emit();
      TestBed.tick();
      expect(scoreRef.value()).toBe(42);
    });

    it('does not disturb state-machine inputs when animations change', async () => {
      const speedInput = { name: 'speed', value: 0 };
      mockRiveInstance.stateMachineInputs = jest.fn().mockReturnValue([speedInput]);
      mockRiveInstance.isPlaying = true;
      (mockRiveInstance as unknown as AnyObj)['animationNames'] = ['idle'];

      fixture.detectChanges();
      await load();

      const dir = fixture.componentInstance.dir();
      const speed = dir.stateMachineInput('SM1', 'speed', 42);
      TestBed.tick();
      expect(speed()).toBe(speedInput);
      expect(speedInput.value).toBe(42);

      fixture.componentInstance.animations = 'run';
      fixture.detectChanges();
      TestBed.tick();
      expect(mockRiveInstance.play).toHaveBeenCalledWith('run');
      expect(speed()).toBe(speedInput);
    });
  });

  describe('error and recovery', () => {
    it('emits riveLoadError and recovers on next src assignment', async () => {
      const errors: unknown[] = [];
      fixture.detectChanges();
      fixture.componentInstance.dir().riveLoadError.subscribe((e) => errors.push(e));

      fixture.componentInstance.src = 'broken.riv';
      fixture.detectChanges();
      TestBed.tick();
      await fixture.whenStable();

      const err = new Error('corrupt');
      fireLoadError(err);
      fixture.detectChanges();
      expect(errors).toEqual([err]);
      expect(fixture.componentInstance.dir().rive()).toBeNull();

      await load('working.riv');
      expect(fixture.componentInstance.dir().rive()).toBe(mockRiveInstance);
    });
  });

  describe('state-machine input caching across lifecycle', () => {
    it('returns the same signal for identical args and different signals for distinct args', () => {
      fixture.detectChanges();
      const dir = fixture.componentInstance.dir();
      const a = dir.stateMachineInput('SM1', 'speed', 10);
      const b = dir.stateMachineInput('SM1', 'speed', 10);
      const c = dir.stateMachineInput('SM1', 'jump');
      expect(a).toBe(b);
      expect(a).not.toBe(c);
    });

    it('re-resolves input values after src swap', async () => {
      const speedA = { name: 'speed', value: 0 };
      mockRiveInstance.stateMachineInputs = jest.fn().mockReturnValue([speedA]);

      fixture.detectChanges();
      await load('one.riv');
      const dir = fixture.componentInstance.dir();
      const speed = dir.stateMachineInput('SM1', 'speed');
      TestBed.tick();
      expect(speed()).toBe(speedA);

      const speedB = { name: 'speed', value: 7 };
      mockRiveInstance.stateMachineInputs = jest.fn().mockReturnValue([speedB]);
      await load('two.riv');

      expect(speed()).toBe(speedB);
    });
  });

  describe('destroy hardening', () => {
    it('tears down cleanly when destroyed before load fires', async () => {
      fixture.detectChanges();
      fixture.componentInstance.src = 'pending.riv';
      fixture.detectChanges();
      TestBed.tick();
      await fixture.whenStable();

      expect(() => fixture.destroy()).not.toThrow();
      expect(mockRiveInstance.cleanup).toHaveBeenCalled();
    });

    it('does not double-emit to output subscribers after destroy', async () => {
      const readyCount = { n: 0 };
      fixture.detectChanges();
      fixture.componentInstance.dir().riveReady.subscribe(() => readyCount.n++);
      await load();
      expect(readyCount.n).toBe(1);

      fixture.destroy();
      const silenced = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        fireLoad();
      } catch {
        /* post-destroy emit throws inside zone — expected */
      }
      silenced.mockRestore();
      expect(readyCount.n).toBe(1);
    });
  });
});
