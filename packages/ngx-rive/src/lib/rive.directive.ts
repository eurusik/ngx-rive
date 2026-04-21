import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  PLATFORM_ID,
  Signal,
  computed,
  effect,
  inject,
  input,
  output,
  runInInjectionContext,
  signal,
  untracked,
} from '@angular/core';
import type {
  AssetLoadCallback,
  Layout,
  Rive,
  RiveFile as RiveFileType,
  StateMachineInput,
} from '@rive-app/canvas';
import { EventType, Fit, Rive as RiveCtor } from '@rive-app/canvas';
import { devicePixelRatio } from './device-pixel-ratio';
import { NgxRiveIntersectionObserver } from './intersection-observer.service';
import { resizeCanvas } from './resize-canvas';
import { NgxRiveBinding, type NgxRiveBindParams } from './rive-binding';

const CHROME_INTERSECTION_RETEST_MS = 10;

type RiveConstructorParams = ConstructorParameters<typeof RiveCtor>[0];

@Directive({
  selector: 'canvas[ngxRive]',
  standalone: true,
  exportAs: 'ngxRive',
})
export class NgxRiveDirective {
  private readonly elementRef = inject<ElementRef<HTMLCanvasElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly intersection = inject(NgxRiveIntersectionObserver);
  private readonly platformId = inject(PLATFORM_ID);

  readonly src = input<string | undefined>(undefined);
  readonly buffer = input<ArrayBuffer | undefined>(undefined);
  readonly riveFile = input<RiveFileType | undefined>(undefined);
  readonly artboard = input<string | undefined>(undefined);
  readonly animations = input<string | string[] | undefined>(undefined);
  readonly stateMachines = input<string | string[] | undefined>(undefined);
  readonly layout = input<Layout | undefined>(undefined);
  readonly autoplay = input<boolean>(true);
  readonly autoBind = input<boolean | undefined>(undefined);
  readonly automaticallyHandleEvents = input<boolean>(false);
  readonly shouldDisableRiveListeners = input<boolean>(false);
  readonly enableRiveAssetCDN = input<boolean | undefined>(undefined);
  readonly assetLoader = input<AssetLoadCallback | undefined>(undefined);

  readonly useDevicePixelRatio = input<boolean>(true);
  readonly customDevicePixelRatio = input<number>(0);
  readonly fitCanvasToArtboardHeight = input<boolean>(false);
  readonly useOffscreenRenderer = input<boolean>(true);
  readonly shouldResizeCanvasToContainer = input<boolean>(true);
  readonly shouldUseIntersectionObserver = input<boolean>(true);

  readonly container = input<HTMLElement | null>(null);

  readonly riveReady = output<Rive>();
  readonly riveLoadError = output<unknown>();

  readonly canvas: HTMLCanvasElement = this.elementRef.nativeElement;
  private readonly _rive = signal<Rive | null>(null);
  readonly rive = this._rive.asReadonly();

  private readonly containerEl = computed<HTMLElement | null>(() => {
    const containerOverride = this.container();
    if (containerOverride) return containerOverride;
    return this.canvas.parentElement;
  });

  private readonly dpr = devicePixelRatio(this.customDevicePixelRatio, { injector: this.injector });
  private readonly bindings = new Map<string, NgxRiveBinding>();
  private readonly stateMachineInputCache = new Map<string, Signal<StateMachineInput | null>>();

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.setupRiveLifecycle();
    this.setupCanvasSizing();
    this.setupIntersectionObserver();
    this.setupAnimationSync();
    this.setupDestroyCleanup();
  }

  bind(params: NgxRiveBindParams = {}): NgxRiveBinding {
    const key = this.bindingKey(params);
    let binding = this.bindings.get(key);
    if (!binding) {
      binding = untracked(() => new NgxRiveBinding(this, params, this.injector));
      this.bindings.set(key, binding);
    }
    return binding;
  }

  stateMachineInput(
    stateMachineName: string,
    inputName: string,
    initialValue?: number | boolean
  ): Signal<StateMachineInput | null> {
    const key = this.stateMachineInputKey(stateMachineName, inputName, initialValue);
    const cached = this.stateMachineInputCache.get(key);
    if (cached) return cached;

    const inputSignal = this.createStateMachineInputSignal(stateMachineName, inputName, initialValue);
    this.stateMachineInputCache.set(key, inputSignal);
    return inputSignal;
  }

  private setupRiveLifecycle(): void {
    effect((onCleanup) => {
      const src = this.src();
      const buffer = this.buffer();
      const file = this.riveFile();
      if (!src && !buffer && !file) return;

      const instance = new RiveCtor(this.buildRiveParams({ src, buffer, file }));
      this.attachRiveLoadHandlers(instance);
      onCleanup(() => this.teardownRiveInstance(instance));
    });
  }

  private setupCanvasSizing(): void {
    resizeCanvas(
      {
        riveLoaded: computed(() => this._rive() != null),
        canvas: computed(() => this.canvas),
        container: this.containerEl,
        artboardBounds: computed(() => this._rive()?.bounds),
        onCanvasHasResized: () => this.handleResized(),
        options: {
          useDevicePixelRatio: this.useDevicePixelRatio(),
          customDevicePixelRatio: this.customDevicePixelRatio(),
          fitCanvasToArtboardHeight: this.fitCanvasToArtboardHeight(),
          shouldResizeCanvasToContainer: this.shouldResizeCanvasToContainer(),
        },
      },
      { injector: this.injector }
    );
  }

  private setupIntersectionObserver(): void {
    effect((onCleanup) => {
      const rive = this._rive();
      if (!rive || !this.shouldUseIntersectionObserver()) return;

      const handlers = this.createIntersectionHandlers(rive, this.canvas);
      this.intersection.observe(this.canvas, handlers.onChange);
      onCleanup(() => {
        handlers.cancelRetest();
        this.intersection.unobserve(this.canvas);
      });
    });
  }

  private setupAnimationSync(): void {
    effect(() => {
      const animations = this.animations();
      const rive = untracked(this._rive);
      if (!rive || !animations) return;
      if (rive.isPlaying) {
        rive.stop(rive.animationNames);
        rive.play(animations);
      } else if (rive.isPaused) {
        rive.stop(rive.animationNames);
        rive.pause(animations);
      }
    });
  }

  private setupDestroyCleanup(): void {
    this.destroyRef.onDestroy(() => this.resetCanvasDimensions());
  }

  private resetCanvasDimensions(): void {
    this.canvas.width = 0;
    this.canvas.height = 0;
  }

  private buildRiveParams(resolved: {
    src: string | undefined;
    buffer: ArrayBuffer | undefined;
    file: RiveFileType | undefined;
  }): RiveConstructorParams {
    return {
      src: resolved.src,
      buffer: resolved.buffer,
      riveFile: resolved.file,
      artboard: untracked(this.artboard),
      animations: untracked(this.animations),
      stateMachines: untracked(this.stateMachines),
      layout: untracked(this.layout),
      autoplay: untracked(this.autoplay),
      autoBind: untracked(this.autoBind),
      automaticallyHandleEvents: untracked(this.automaticallyHandleEvents),
      shouldDisableRiveListeners: untracked(this.shouldDisableRiveListeners),
      enableRiveAssetCDN: untracked(this.enableRiveAssetCDN),
      assetLoader: untracked(this.assetLoader),
      useOffscreenRenderer: untracked(this.useOffscreenRenderer),
      canvas: this.canvas,
    };
  }

  private attachRiveLoadHandlers(instance: Rive): void {
    instance.on(EventType.Load, () => {
      this._rive.set(instance);
      this.riveReady.emit(instance);
    });
    instance.on(EventType.LoadError, (err) => {
      this.riveLoadError.emit(err);
    });
  }

  private teardownRiveInstance(instance: Rive): void {
    try {
      instance.cleanup();
    } catch {}
    if (this._rive() === instance) this._rive.set(null);
  }

  private createIntersectionHandlers(
    rive: Rive,
    canvasEl: HTMLCanvasElement
  ): { onChange: (entry: IntersectionObserverEntry) => void; cancelRetest: () => void } {
    const state = { isPaused: false };
    const retest = scheduleChromeRetest(canvasEl, rive, state);

    const onChange = (entry: IntersectionObserverEntry): void => {
      if (entry.isIntersecting) rive.startRendering();
      else rive.stopRendering();
      state.isPaused = !entry.isIntersecting;
      retest.cancel();
      if (!entry.isIntersecting && entry.boundingClientRect.width === 0) {
        retest.arm();
      }
    };

    return { onChange, cancelRetest: retest.cancel };
  }

  private handleResized(): void {
    const rive = this._rive();
    if (!rive) return;
    const canvasEl = this.canvas;
    if (rive.layout && rive.layout.fit === Fit.Layout) {
      const dpr = this.dpr();
      const layoutScaleFactor = dpr * rive.layout.layoutScaleFactor;
      rive.devicePixelRatioUsed = dpr;
      rive.artboardWidth = canvasEl.width / layoutScaleFactor;
      rive.artboardHeight = canvasEl.height / layoutScaleFactor;
    }
    rive.startRendering();
    rive.resizeToCanvas();
  }

  private createStateMachineInputSignal(
    stateMachineName: string,
    inputName: string,
    initialValue?: number | boolean
  ): Signal<StateMachineInput | null> {
    return runInInjectionContext(this.injector, () => {
      const smInput = computed<StateMachineInput | null>(() =>
        findStateMachineInput(this._rive(), stateMachineName, inputName)
      );
      if (initialValue !== undefined) {
        effect(() => {
          const resolved = smInput();
          if (resolved) resolved.value = initialValue;
        });
      }
      return smInput;
    });
  }

  private bindingKey(params: NgxRiveBindParams): string {
    const viewModel = params.viewModel ? `n:${params.viewModel}` : 'd:default';
    const selector = params.instance;
    const instance =
      typeof selector === 'object' && selector
        ? `named:${selector.name}`
        : `kind:${selector ?? 'default'}`;
    const autoBind = `ab:${params.autoBind === false ? '0' : '1'}`;
    return `${viewModel}\u0000${instance}\u0000${autoBind}`;
  }

  private stateMachineInputKey(
    stateMachineName: string,
    inputName: string,
    initialValue?: number | boolean
  ): string {
    return `${stateMachineName}\u0000${inputName}\u0000${initialValue ?? ''}`;
  }
}

function findStateMachineInput(
  rive: Rive | null,
  stateMachineName: string,
  inputName: string
): StateMachineInput | null {
  if (!rive) return null;
  const inputs = rive.stateMachineInputs(stateMachineName);
  return inputs?.find((candidate) => candidate.name === inputName) ?? null;
}

function isStillOnScreen(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  const viewportWidth = globalThis.innerWidth || document.documentElement.clientWidth;
  const viewportHeight = globalThis.innerHeight || document.documentElement.clientHeight;
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.top < viewportHeight &&
    rect.bottom > 0 &&
    rect.left < viewportWidth &&
    rect.right > 0
  );
}

function scheduleChromeRetest(
  canvasEl: HTMLCanvasElement,
  rive: Rive,
  state: { isPaused: boolean }
): { arm: () => void; cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const fire = (): void => {
    if (!state.isPaused) return;
    if (isStillOnScreen(canvasEl)) {
      rive.startRendering();
      state.isPaused = false;
    }
  };
  return {
    arm: () => {
      timeoutId = setTimeout(fire, CHROME_INTERSECTION_RETEST_MS);
    },
    cancel: () => {
      if (timeoutId) clearTimeout(timeoutId);
    },
  };
}
