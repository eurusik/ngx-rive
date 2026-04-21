import {
  Injector,
  Signal,
  computed,
  effect,
  runInInjectionContext,
  untracked,
} from '@angular/core';
import type { Rive, ViewModel, ViewModelInstance } from '@rive-app/canvas';
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
} from './internal/property-factories';
import type {
  NgxRiveTriggerParams,
  ViewModelInstanceArtboardResult,
  ViewModelInstanceBooleanResult,
  ViewModelInstanceColorResult,
  ViewModelInstanceEnumResult,
  ViewModelInstanceImageResult,
  ViewModelInstanceListResult,
  ViewModelInstanceNumberResult,
  ViewModelInstanceStringResult,
  ViewModelInstanceTriggerResult,
} from './types';

export interface NgxRiveBindParams {
  /** Name of the ViewModel. When omitted, uses `rive.defaultViewModel()`. */
  viewModel?: string;
  /** Which instance to use: `'default'` (default), `'new'`, or `{ name: '...' }`. */
  instance?: 'default' | 'new' | { name: string };
  /** When true (default), binds the instance to Rive via `rive.bindViewModelInstance()`. */
  autoBind?: boolean;
}

interface RiveSource {
  readonly rive: Signal<Rive | null>;
}

/**
 * Reactive binding to a Rive {@link ViewModelInstance}. Created via
 * `NgxRiveDirective.bind(params)`. Exposes `viewModel` / `viewModelInstance`
 * as signals and lazily builds type-safe property refs keyed by path.
 *
 * Property refs are cached: calling `.string('title')` twice returns the same
 * reactive pair, so value signals remain stable across change detection.
 */
export class NgxRiveBinding {
  readonly viewModel: Signal<ViewModel | null>;
  readonly viewModelInstance: Signal<ViewModelInstance | null>;

  private readonly cache = new Map<string, unknown>();
  private readonly ctx: { injector: Injector };

  constructor(source: RiveSource, params: NgxRiveBindParams, injector: Injector) {
    this.ctx = { injector };
    const autoBind = params.autoBind ?? true;

    const [viewModel, viewModelInstance] = runInInjectionContext(injector, () => {
      const vm = computed<ViewModel | null>(() => {
        const rive = source.rive();
        if (!rive) return null;
        return params.viewModel
          ? rive.viewModelByName?.(params.viewModel) ?? null
          : rive.defaultViewModel?.() ?? null;
      });

      const vmi = computed<ViewModelInstance | null>(() => {
        const model = vm();
        if (!model) return null;
        const sel = params.instance;
        if (sel === 'new') return model.instance?.() ?? null;
        if (sel && typeof sel === 'object') return model.instanceByName?.(sel.name) ?? null;
        return model.defaultInstance?.() ?? null;
      });

      if (autoBind) {
        effect(() => {
          const inst = vmi();
          const rive = source.rive();
          if (rive && inst && rive.viewModelInstance !== inst) {
            rive.bindViewModelInstance(inst);
          }
        });
      }

      return [vm, vmi] as const;
    });

    this.viewModel = viewModel;
    this.viewModelInstance = viewModelInstance;
  }

  number(path: string): ViewModelInstanceNumberResult {
    return this.resolve('number', path, () => buildNumber(path, this.viewModelInstance, this.ctx));
  }

  string(path: string): ViewModelInstanceStringResult {
    return this.resolve('string', path, () => buildString(path, this.viewModelInstance, this.ctx));
  }

  boolean(path: string): ViewModelInstanceBooleanResult {
    return this.resolve('boolean', path, () =>
      buildBoolean(path, this.viewModelInstance, this.ctx)
    );
  }

  color(path: string): ViewModelInstanceColorResult {
    return this.resolve('color', path, () => buildColor(path, this.viewModelInstance, this.ctx));
  }

  enum(path: string): ViewModelInstanceEnumResult {
    return this.resolve('enum', path, () => buildEnum(path, this.viewModelInstance, this.ctx));
  }

  trigger(path: string, params?: NgxRiveTriggerParams): ViewModelInstanceTriggerResult {
    return this.resolve('trigger', path, () =>
      buildTrigger(path, this.viewModelInstance, this.ctx, params)
    );
  }

  image(path: string): ViewModelInstanceImageResult {
    return this.resolve('image', path, () => buildImage(path, this.viewModelInstance, this.ctx));
  }

  list(path: string): ViewModelInstanceListResult {
    return this.resolve('list', path, () => buildList(path, this.viewModelInstance, this.ctx));
  }

  artboard(path: string): ViewModelInstanceArtboardResult {
    return this.resolve('artboard', path, () =>
      buildArtboard(path, this.viewModelInstance, this.ctx)
    );
  }

  private resolve<T>(kind: PropertyKind, path: string, build: () => T): T {
    const key = `${kind}:${path}`;
    let ref = this.cache.get(key) as T | undefined;
    if (!ref) {
      // Property builders register `effect()`s; a consumer may call us from
      // inside their own effect, so strip the outer reactive context first.
      ref = untracked(build);
      this.cache.set(key, ref);
    }
    return ref;
  }
}

/** Discriminator for `NgxRiveBinding.resolve()` cache — one per property kind. */
type PropertyKind =
  | 'number'
  | 'string'
  | 'boolean'
  | 'color'
  | 'enum'
  | 'trigger'
  | 'image'
  | 'list'
  | 'artboard';
