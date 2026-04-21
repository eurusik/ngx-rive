import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Signal,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { Layout, Rive } from '@rive-app/canvas';
import { NgxRiveDirective } from './rive.directive';

@Component({
  selector: 'ngx-rive',
  standalone: true,
  imports: [NgxRiveDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host { display: block; }
      canvas { display: block; vertical-align: top; width: 0; height: 0; }
    `,
  ],
  template: `
    <canvas
      ngxRive
      [src]="src()"
      [artboard]="artboard()"
      [animations]="animations()"
      [stateMachines]="stateMachines()"
      [layout]="layout()"
      [autoplay]="autoplay()"
      [autoBind]="autoBind()"
      [automaticallyHandleEvents]="automaticallyHandleEvents()"
      [shouldDisableRiveListeners]="shouldDisableRiveListeners()"
      [shouldResizeCanvasToContainer]="shouldResizeCanvasToContainer()"
      [useOffscreenRenderer]="useOffscreenRenderer()"
      [container]="hostElement"
      [attr.role]="ariaLabel() ? role() : null"
      [attr.aria-label]="ariaLabel()"
    >
      <ng-content></ng-content>
    </canvas>
  `,
})
export class NgxRiveComponent {
  protected readonly hostElement: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly src = input.required<string>();
  readonly artboard = input<string | undefined>(undefined);
  readonly animations = input<string | string[] | undefined>(undefined);
  readonly stateMachines = input<string | string[] | undefined>(undefined);
  readonly layout = input<Layout | undefined>(undefined);
  readonly autoplay = input<boolean>(true);
  readonly autoBind = input<boolean | undefined>(undefined);
  readonly useOffscreenRenderer = input<boolean>(true);
  readonly shouldDisableRiveListeners = input<boolean>(false);
  readonly shouldResizeCanvasToContainer = input<boolean>(true);
  readonly automaticallyHandleEvents = input<boolean>(false);

  readonly role = input<string>('img');
  readonly ariaLabel = input<string | undefined>(undefined);

  readonly riveReady = output<Rive>();
  readonly riveLoadError = output<unknown>();

  readonly directive = viewChild.required(NgxRiveDirective);
  readonly rive: Signal<Rive | null> = computed(() => this.directive().rive());

  constructor() {
    effect((onCleanup) => {
      const dir = this.directive();
      const readySub = dir.riveReady.subscribe((r) => this.riveReady.emit(r));
      const errorSub = dir.riveLoadError.subscribe((e) => this.riveLoadError.emit(e));
      onCleanup(() => {
        readySub.unsubscribe();
        errorSub.unsubscribe();
      });
    });
  }
}
