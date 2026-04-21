import { Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  Rive,
  fireLoad,
  fireLoadError,
  mockRiveInstance,
  resetMockRive,
} from '../__mocks__/rive-canvas.mock';
import { NgxRiveDirective } from './rive.directive';

interface AnyObj {
  [k: string]: unknown;
}

@Component({
  standalone: true,
  imports: [NgxRiveDirective],
  template: `<canvas
    ngxRive
    [src]="src"
    [buffer]="buffer"
    [riveFile]="riveFile"
    [artboard]="artboard"
    [animations]="animations"
    [stateMachines]="stateMachines"
    [shouldUseIntersectionObserver]="useIO"
    [container]="container"
    #r="ngxRive"
  ></canvas>`,
})
class HostComponent {
  src: string | undefined = undefined;
  buffer: ArrayBuffer | undefined = undefined;
  riveFile: unknown = undefined;
  artboard: string | undefined = undefined;
  animations: string | string[] | undefined = undefined;
  stateMachines: string | string[] | undefined = undefined;
  useIO = true;
  container: HTMLElement | null = null;
  readonly r = viewChild.required(NgxRiveDirective);
}

describe('NgxRiveDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let ioMock: { observe: jest.Mock; unobserve: jest.Mock; disconnect: jest.Mock };
  let ioCallback: (entries: IntersectionObserverEntry[]) => void;
  let originalIO: typeof IntersectionObserver | undefined;

  beforeEach(() => {
    resetMockRive();
    (Rive as unknown as jest.Mock).mockClear();
    mockRiveInstance.isPlaying = false;
    mockRiveInstance.isPaused = false;
    mockRiveInstance.animationNames = [];
    (mockRiveInstance as unknown as AnyObj)['layout'] = null;

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

  async function loadRive(): Promise<void> {
    fixture.componentInstance.src = 'file.riv';
    fixture.detectChanges();
    TestBed.tick();
    await fixture.whenStable();
    fireLoad();
    fixture.detectChanges();
  }

  function riveCtorCalls(): number {
    return (Rive as unknown as jest.Mock).mock.calls.length;
  }

  function riveCtorArg(call = 0): Record<string, unknown> {
    return (Rive as unknown as jest.Mock).mock.calls[call][0] as Record<string, unknown>;
  }

  describe('src lifecycle', () => {
    it('has a null rive signal until src is set', () => {
      fixture.detectChanges();
      expect(fixture.componentInstance.r().rive()).toBeNull();
      expect(riveCtorCalls()).toBe(0);
    });

    it('constructs Rive when src is set and publishes on load', async () => {
      fixture.detectChanges();
      await loadRive();
      expect(fixture.componentInstance.r().rive()).toBe(mockRiveInstance);
      expect(riveCtorCalls()).toBe(1);
    });

    it('reconstructs Rive when src changes to a new value', async () => {
      fixture.detectChanges();
      await loadRive();
      expect(riveCtorCalls()).toBe(1);

      fixture.componentInstance.src = 'another.riv';
      fixture.detectChanges();
      TestBed.tick();
      await fixture.whenStable();

      expect(riveCtorCalls()).toBe(2);
      expect(mockRiveInstance.cleanup).toHaveBeenCalled();
    });

    it('tears down Rive and nulls the signal when src is cleared', async () => {
      fixture.detectChanges();
      await loadRive();
      expect(fixture.componentInstance.r().rive()).toBe(mockRiveInstance);

      fixture.componentInstance.src = undefined;
      fixture.detectChanges();
      TestBed.tick();
      await fixture.whenStable();

      expect(mockRiveInstance.cleanup).toHaveBeenCalled();
      expect(fixture.componentInstance.r().rive()).toBeNull();
    });

    it('constructs Rive with a buffer input', async () => {
      const buf = new ArrayBuffer(8);
      fixture.componentInstance.buffer = buf;
      fixture.detectChanges();
      TestBed.tick();
      await fixture.whenStable();

      expect(riveCtorCalls()).toBe(1);
      expect(riveCtorArg()['buffer']).toBe(buf);
    });

    it('constructs Rive with a riveFile input', async () => {
      const file = { kind: 'fake-rive-file' };
      fixture.componentInstance.riveFile = file;
      fixture.detectChanges();
      TestBed.tick();
      await fixture.whenStable();

      expect(riveCtorCalls()).toBe(1);
      expect(riveCtorArg()['riveFile']).toBe(file);
    });

    it('forwards artboard + stateMachines to the Rive constructor', async () => {
      fixture.componentInstance.artboard = 'Main';
      fixture.componentInstance.stateMachines = 'SM1';
      fixture.componentInstance.src = 'file.riv';
      fixture.detectChanges();
      TestBed.tick();
      await fixture.whenStable();

      const args = riveCtorArg();
      expect(args['artboard']).toBe('Main');
      expect(args['stateMachines']).toBe('SM1');
    });
  });

  describe('load events', () => {
    it('emits riveReady with the instance on load', async () => {
      const emitted: unknown[] = [];
      fixture.detectChanges();
      fixture.componentInstance.r().riveReady.subscribe((r) => emitted.push(r));
      await loadRive();

      expect(emitted).toEqual([mockRiveInstance]);
    });

    it('emits riveLoadError when load fails', async () => {
      const emitted: unknown[] = [];
      fixture.detectChanges();
      fixture.componentInstance.r().riveLoadError.subscribe((e) => emitted.push(e));

      fixture.componentInstance.src = 'file.riv';
      fixture.detectChanges();
      TestBed.tick();
      await fixture.whenStable();

      const err = new Error('boom');
      fireLoadError(err);
      fixture.detectChanges();

      expect(emitted).toEqual([err]);
      expect(fixture.componentInstance.r().rive()).toBeNull();
    });
  });

  describe('destroy', () => {
    it('calls Rive.cleanup() on destroy', async () => {
      fixture.detectChanges();
      await loadRive();
      fixture.destroy();
      expect(mockRiveInstance.cleanup).toHaveBeenCalled();
    });

    it('zeroes canvas dimensions on destroy', async () => {
      fixture.detectChanges();
      await loadRive();
      const canvas = fixture.componentInstance.r().canvas;
      canvas.width = 400;
      canvas.height = 300;

      fixture.destroy();
      expect(canvas.width).toBe(0);
      expect(canvas.height).toBe(0);
    });
  });

  describe('intersection observer', () => {
    it('observes the canvas after rive loads', async () => {
      fixture.detectChanges();
      await loadRive();
      const canvas = fixture.componentInstance.r().canvas;
      expect(ioMock.observe).toHaveBeenCalledWith(canvas);
    });

    it('does not observe when shouldUseIntersectionObserver is false', async () => {
      fixture.componentInstance.useIO = false;
      fixture.detectChanges();
      await loadRive();
      expect(ioMock.observe).not.toHaveBeenCalled();
    });

    it('calls startRendering when the canvas intersects', async () => {
      fixture.detectChanges();
      await loadRive();
      const canvas = fixture.componentInstance.r().canvas;
      (mockRiveInstance.startRendering as jest.Mock).mockClear();

      ioCallback([
        {
          target: canvas,
          isIntersecting: true,
          boundingClientRect: { width: 10 },
        } as unknown as IntersectionObserverEntry,
      ]);

      expect(mockRiveInstance.startRendering).toHaveBeenCalled();
    });

    it('calls stopRendering when the canvas leaves the viewport', async () => {
      fixture.detectChanges();
      await loadRive();
      const canvas = fixture.componentInstance.r().canvas;

      ioCallback([
        {
          target: canvas,
          isIntersecting: false,
          boundingClientRect: { width: 10 },
        } as unknown as IntersectionObserverEntry,
      ]);

      expect(mockRiveInstance.stopRendering).toHaveBeenCalled();
    });

    it('unobserves the canvas on destroy', async () => {
      fixture.detectChanges();
      await loadRive();
      const canvas = fixture.componentInstance.r().canvas;
      fixture.destroy();
      expect(ioMock.unobserve).toHaveBeenCalledWith(canvas);
    });
  });

  describe('animation sync', () => {
    it('stops + plays when animations change while rive is playing', async () => {
      fixture.detectChanges();
      await loadRive();
      mockRiveInstance.isPlaying = true;
      (mockRiveInstance as unknown as AnyObj)['animationNames'] = ['idle'];
      (mockRiveInstance.stop as jest.Mock).mockClear();
      (mockRiveInstance.play as jest.Mock).mockClear();

      fixture.componentInstance.animations = 'run';
      fixture.detectChanges();
      TestBed.tick();

      expect(mockRiveInstance.stop).toHaveBeenCalledWith(['idle']);
      expect(mockRiveInstance.play).toHaveBeenCalledWith('run');
    });

    it('stops + pauses when animations change while rive is paused', async () => {
      fixture.detectChanges();
      await loadRive();
      mockRiveInstance.isPaused = true;
      (mockRiveInstance as unknown as AnyObj)['animationNames'] = ['idle'];
      (mockRiveInstance.stop as jest.Mock).mockClear();
      (mockRiveInstance.pause as jest.Mock).mockClear();

      fixture.componentInstance.animations = 'run';
      fixture.detectChanges();
      TestBed.tick();

      expect(mockRiveInstance.stop).toHaveBeenCalledWith(['idle']);
      expect(mockRiveInstance.pause).toHaveBeenCalledWith('run');
    });

    it('is a no-op when rive has not loaded yet', () => {
      fixture.detectChanges();
      fixture.componentInstance.animations = 'run';
      fixture.detectChanges();
      TestBed.tick();

      expect(mockRiveInstance.stop).not.toHaveBeenCalled();
      expect(mockRiveInstance.play).not.toHaveBeenCalled();
      expect(mockRiveInstance.pause).not.toHaveBeenCalled();
    });
  });

  describe('container input', () => {
    it('uses the explicit container over canvas.parentElement', () => {
      const custom = document.createElement('section');
      fixture.componentInstance.container = custom;
      fixture.detectChanges();

      const dir = fixture.componentInstance.r() as unknown as {
        containerEl: () => HTMLElement | null;
      };
      expect(dir.containerEl()).toBe(custom);
    });

    it('falls back to canvas.parentElement when no container is set', () => {
      fixture.detectChanges();
      const dir = fixture.componentInstance.r() as unknown as {
        containerEl: () => HTMLElement | null;
      };
      expect(dir.containerEl()).toBe(fixture.componentInstance.r().canvas.parentElement);
    });
  });

  describe('bind()', () => {
    it('returns the same instance for identical params', () => {
      fixture.detectChanges();
      const dir = fixture.componentInstance.r();
      expect(dir.bind({ viewModel: 'A' })).toBe(dir.bind({ viewModel: 'A' }));
    });

    it('distinguishes by viewModel name', () => {
      fixture.detectChanges();
      const dir = fixture.componentInstance.r();
      expect(dir.bind({ viewModel: 'A' })).not.toBe(dir.bind({ viewModel: 'B' }));
    });

    it('distinguishes instance: "new" from default', () => {
      fixture.detectChanges();
      const dir = fixture.componentInstance.r();
      expect(dir.bind({ viewModel: 'A', instance: 'new' })).not.toBe(
        dir.bind({ viewModel: 'A' })
      );
    });

    it('distinguishes instance: { name: "X" } from default', () => {
      fixture.detectChanges();
      const dir = fixture.componentInstance.r();
      expect(dir.bind({ viewModel: 'A', instance: { name: 'X' } })).not.toBe(
        dir.bind({ viewModel: 'A' })
      );
    });

    it('distinguishes autoBind: false from autoBind: true', () => {
      fixture.detectChanges();
      const dir = fixture.componentInstance.r();
      expect(dir.bind({ viewModel: 'A', autoBind: false })).not.toBe(
        dir.bind({ viewModel: 'A', autoBind: true })
      );
    });

    it('viewModel: "default" does not collide with no viewModel', () => {
      fixture.detectChanges();
      const dir = fixture.componentInstance.r();
      expect(dir.bind({ viewModel: 'default' })).not.toBe(dir.bind({}));
    });

    it('instance: { name: "default" } does not collide with instance: "default"', () => {
      fixture.detectChanges();
      const dir = fixture.componentInstance.r();
      expect(dir.bind({ viewModel: 'A', instance: { name: 'default' } })).not.toBe(
        dir.bind({ viewModel: 'A', instance: 'default' })
      );
    });
  });

  describe('stateMachineInput()', () => {
    it('resolves a matching input and applies initialValue', async () => {
      const input = { name: 'speed', value: 0 };
      mockRiveInstance.stateMachineInputs = jest.fn().mockReturnValue([input]);

      fixture.detectChanges();
      await loadRive();
      const smi = fixture.componentInstance.r().stateMachineInput('SM1', 'speed', 42);
      TestBed.tick();

      expect(smi()).toBe(input);
      expect(input.value).toBe(42);
    });

    it('returns null when no input matches', async () => {
      mockRiveInstance.stateMachineInputs = jest.fn().mockReturnValue([{ name: 'other' }]);

      fixture.detectChanges();
      await loadRive();
      const smi = fixture.componentInstance.r().stateMachineInput('SM1', 'speed');
      TestBed.tick();

      expect(smi()).toBeNull();
    });

    it('caches identical calls', () => {
      fixture.detectChanges();
      const dir = fixture.componentInstance.r();
      expect(dir.stateMachineInput('SM1', 'speed', 42)).toBe(
        dir.stateMachineInput('SM1', 'speed', 42)
      );
    });

    it('distinguishes by initial value', () => {
      fixture.detectChanges();
      const dir = fixture.componentInstance.r();
      expect(dir.stateMachineInput('SM1', 'speed', 10)).not.toBe(
        dir.stateMachineInput('SM1', 'speed', 20)
      );
    });

    it('does not mutate input.value when no initialValue is provided', async () => {
      const input = { name: 'speed', value: 99 };
      mockRiveInstance.stateMachineInputs = jest.fn().mockReturnValue([input]);

      fixture.detectChanges();
      await loadRive();
      const smi = fixture.componentInstance.r().stateMachineInput('SM1', 'speed');
      TestBed.tick();

      expect(smi()).toBe(input);
      expect(input.value).toBe(99);
    });

    it('returns null after rive is torn down', async () => {
      const input = { name: 'speed', value: 0 };
      mockRiveInstance.stateMachineInputs = jest.fn().mockReturnValue([input]);

      fixture.detectChanges();
      await loadRive();
      const smi = fixture.componentInstance.r().stateMachineInput('SM1', 'speed');
      TestBed.tick();
      expect(smi()).toBe(input);

      fixture.componentInstance.src = undefined;
      fixture.detectChanges();
      TestBed.tick();
      await fixture.whenStable();

      expect(smi()).toBeNull();
    });
  });
});
