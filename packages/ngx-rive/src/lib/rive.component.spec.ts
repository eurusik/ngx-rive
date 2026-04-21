import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Layout } from '@rive-app/canvas';
import { fireLoad, fireLoadError, mockRiveInstance, resetMockRive, Rive } from '../__mocks__/rive-canvas.mock';
import { NgxRiveComponent } from './rive.component';

@Component({
  standalone: true,
  imports: [NgxRiveComponent],
  template: `
    <ngx-rive
      [src]="src"
      [artboard]="artboard"
      [animations]="animations"
      [stateMachines]="stateMachines"
      [layout]="layout"
      [autoplay]="autoplay"
      [autoBind]="autoBind"
      [useOffscreenRenderer]="useOffscreenRenderer"
      [shouldDisableRiveListeners]="shouldDisableRiveListeners"
      [shouldResizeCanvasToContainer]="shouldResizeCanvasToContainer"
      [automaticallyHandleEvents]="automaticallyHandleEvents"
      [role]="role"
      [ariaLabel]="ariaLabel"
      (riveReady)="ready.push($event)"
      (riveLoadError)="errors.push($event)"
    >
      <p class="content">projected</p>
    </ngx-rive>
  `,
})
class HostComponent {
  src = 'file.riv';
  artboard: string | undefined = undefined;
  animations: string | string[] | undefined = undefined;
  stateMachines: string | string[] | undefined = undefined;
  layout: Layout | undefined = undefined;
  autoplay = true;
  autoBind: boolean | undefined = undefined;
  useOffscreenRenderer = true;
  shouldDisableRiveListeners = false;
  shouldResizeCanvasToContainer = true;
  automaticallyHandleEvents = false;
  role = 'img';
  ariaLabel: string | undefined = undefined;
  ready: unknown[] = [];
  errors: unknown[] = [];
  @ViewChild(NgxRiveComponent) component!: NgxRiveComponent;
}

describe('NgxRiveComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    resetMockRive();
    (Rive as unknown as jest.Mock).mockClear();
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
  });

  function canvas(): HTMLCanvasElement {
    return fixture.nativeElement.querySelector('canvas');
  }

  function riveCtorArg(call = 0): Record<string, unknown> {
    return (Rive as unknown as jest.Mock).mock.calls[call][0] as Record<string, unknown>;
  }

  describe('rendering', () => {
    it('renders a canvas with the ngxRive directive applied', () => {
      fixture.detectChanges();
      expect(canvas()).toBeTruthy();
      expect((Rive as unknown as jest.Mock)).toHaveBeenCalledTimes(1);
    });

    it('projects content into the canvas via <ng-content>', () => {
      fixture.detectChanges();
      const projected = fixture.nativeElement.querySelector('canvas .content');
      expect(projected?.textContent).toBe('projected');
    });
  });

  describe('input forwarding', () => {
    it('forwards src/artboard/animations', async () => {
      fixture.componentInstance.artboard = 'Main';
      fixture.componentInstance.animations = 'idle';
      fixture.detectChanges();
      TestBed.tick();
      await fixture.whenStable();

      const args = riveCtorArg();
      expect(args['src']).toBe('file.riv');
      expect(args['artboard']).toBe('Main');
      expect(args['animations']).toBe('idle');
    });

    it('forwards autoBind', async () => {
      fixture.componentInstance.autoBind = false;
      fixture.detectChanges();
      TestBed.tick();
      await fixture.whenStable();
      expect(riveCtorArg()['autoBind']).toBe(false);
    });

    it('forwards stateMachines, layout, autoplay, and render flags', async () => {
      const layout = { fit: 'cover' } as unknown as Layout;
      fixture.componentInstance.stateMachines = 'SM1';
      fixture.componentInstance.layout = layout;
      fixture.componentInstance.autoplay = false;
      fixture.componentInstance.useOffscreenRenderer = false;
      fixture.componentInstance.shouldDisableRiveListeners = true;
      fixture.componentInstance.automaticallyHandleEvents = true;
      fixture.detectChanges();
      TestBed.tick();
      await fixture.whenStable();

      const args = riveCtorArg();
      expect(args['stateMachines']).toBe('SM1');
      expect(args['layout']).toBe(layout);
      expect(args['autoplay']).toBe(false);
      expect(args['useOffscreenRenderer']).toBe(false);
      expect(args['shouldDisableRiveListeners']).toBe(true);
      expect(args['automaticallyHandleEvents']).toBe(true);
    });

    it('forwards shouldResizeCanvasToContainer to the directive signal', () => {
      fixture.componentInstance.shouldResizeCanvasToContainer = false;
      fixture.detectChanges();
      expect(fixture.componentInstance.component.directive().shouldResizeCanvasToContainer()).toBe(false);
    });
  });

  describe('architectural contracts', () => {
    it('uses the host element as the directive container (no wrapper div)', () => {
      fixture.detectChanges();
      const ngxRiveEl = fixture.nativeElement.querySelector('ngx-rive') as HTMLElement;
      expect(fixture.componentInstance.component.directive().container()).toBe(ngxRiveEl);
    });

    it('exposes the underlying directive via component.directive()', () => {
      fixture.detectChanges();
      const dir = fixture.componentInstance.component.directive();
      expect(dir).toBeTruthy();
      expect(typeof dir.bind).toBe('function');
      expect(typeof dir.stateMachineInput).toBe('function');
    });
  });

  describe('rive signal', () => {
    it('starts null and mirrors directive.rive() after load', async () => {
      fixture.detectChanges();
      TestBed.tick();
      await fixture.whenStable();
      expect(fixture.componentInstance.component.rive()).toBeNull();

      fireLoad();
      fixture.detectChanges();
      expect(fixture.componentInstance.component.rive()).toBe(mockRiveInstance);
    });
  });

  describe('output forwarding', () => {
    it('forwards a single riveReady emission to the host', async () => {
      fixture.detectChanges();
      TestBed.tick();
      await fixture.whenStable();
      fireLoad();
      fixture.detectChanges();
      expect(fixture.componentInstance.ready).toEqual([mockRiveInstance]);
    });

    it('forwards multiple riveReady emissions', async () => {
      fixture.detectChanges();
      TestBed.tick();
      await fixture.whenStable();
      fireLoad();
      fireLoad();
      fireLoad();
      fixture.detectChanges();
      expect(fixture.componentInstance.ready.length).toBe(3);
    });

    it('forwards riveLoadError emissions', async () => {
      fixture.detectChanges();
      TestBed.tick();
      await fixture.whenStable();

      const errA = new Error('first');
      const errB = new Error('second');
      fireLoadError(errA);
      fireLoadError(errB);
      fixture.detectChanges();

      expect(fixture.componentInstance.errors).toEqual([errA, errB]);
    });
  });

  describe('accessibility', () => {
    it('sets aria-label and role when both are provided', () => {
      fixture.componentInstance.ariaLabel = 'stocks animation';
      fixture.detectChanges();
      expect(canvas().getAttribute('aria-label')).toBe('stocks animation');
      expect(canvas().getAttribute('role')).toBe('img');
    });

    it('honours a custom role when ariaLabel is set', () => {
      fixture.componentInstance.role = 'application';
      fixture.componentInstance.ariaLabel = 'interactive chart';
      fixture.detectChanges();
      expect(canvas().getAttribute('role')).toBe('application');
    });

    it('omits role when no aria-label is provided', () => {
      fixture.detectChanges();
      expect(canvas().getAttribute('role')).toBeNull();
      expect(canvas().getAttribute('aria-label')).toBeNull();
    });

    it('updates aria-label and role reactively', () => {
      fixture.detectChanges();
      expect(canvas().getAttribute('role')).toBeNull();

      fixture.componentInstance.ariaLabel = 'set';
      fixture.detectChanges();
      expect(canvas().getAttribute('aria-label')).toBe('set');
      expect(canvas().getAttribute('role')).toBe('img');

      fixture.componentInstance.ariaLabel = undefined;
      fixture.detectChanges();
      expect(canvas().getAttribute('aria-label')).toBeNull();
      expect(canvas().getAttribute('role')).toBeNull();
    });
  });

  describe('lifecycle', () => {
    it('reconstructs Rive when src changes', async () => {
      fixture.detectChanges();
      TestBed.tick();
      await fixture.whenStable();
      expect((Rive as unknown as jest.Mock)).toHaveBeenCalledTimes(1);

      fixture.componentInstance.src = 'next.riv';
      fixture.detectChanges();
      TestBed.tick();
      await fixture.whenStable();

      expect((Rive as unknown as jest.Mock)).toHaveBeenCalledTimes(2);
      expect(mockRiveInstance.cleanup).toHaveBeenCalled();
    });

    it('tears down the underlying Rive on destroy', async () => {
      fixture.detectChanges();
      TestBed.tick();
      await fixture.whenStable();
      fireLoad();
      fixture.detectChanges();

      fixture.destroy();
      expect(mockRiveInstance.cleanup).toHaveBeenCalled();
    });

    it('stops forwarding directive outputs after destroy', async () => {
      fixture.detectChanges();
      TestBed.tick();
      await fixture.whenStable();
      const host = fixture.componentInstance;
      fireLoad();
      fixture.detectChanges();
      expect(host.ready.length).toBe(1);

      const dir = host.component.directive();
      fixture.destroy();
      dir.riveReady.emit(mockRiveInstance as unknown as Parameters<typeof dir.riveReady.emit>[0]);
      expect(host.ready.length).toBe(1);
    });
  });
});
