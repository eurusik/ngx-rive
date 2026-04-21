import {
  Injector,
  Signal,
  WritableSignal,
  assertInInjectionContext,
  effect,
  inject,
  runInInjectionContext,
  signal,
  untracked,
} from '@angular/core';
import type { ViewModelInstance, ViewModelInstanceValue } from '@rive-app/canvas';

export interface ViewModelInstancePropertyOptions<TProperty, TValue, TOperations, TExtended> {
  readonly getProperty: (vm: ViewModelInstance, path: string) => TProperty | null;
  readonly getValue: (prop: TProperty) => TValue;
  readonly defaultValue: TValue | null;
  readonly buildPropertyOperations: (
    safeAccess: <TReturn>(callback: (prop: TProperty) => TReturn) => TReturn | undefined
  ) => TOperations;
  readonly onPropertyEvent?: () => void;
  readonly getExtendedData?: (prop: TProperty) => TExtended;
}

type ExtendedPart<TExtended> = TExtended extends undefined
  ? Record<string, never>
  : { extendedData: Signal<TExtended | null> };

export type ViewModelInstancePropertyResult<TValue, TOperations, TExtended = undefined> =
  TOperations & { value: Signal<TValue | null> } & ExtendedPart<TExtended>;

/**
 * Generic factory for ViewModelInstance property refs. Signal-first port of
 * rive-react's `useViewModelInstanceProperty`.
 *
 * Deviates from "effect() is for side effects, not state sync": Rive exposes
 * changes as plain `prop.on(cb)` callbacks, not Observables. Bridging via
 * `fromEventPattern` would force RxJS onto every consumer. Per-property-ref
 * scope + `onCleanup` keeps it leak-free. Setters go through `untracked()`
 * so consumer effects don't track our bookkeeping signals.
 */
export function createViewModelInstanceProperty<
  TProperty extends ViewModelInstanceValue,
  TValue,
  TOperations extends object,
  TExtended = undefined
>(
  path: string | Signal<string>,
  vmi: Signal<ViewModelInstance | null | undefined> | ViewModelInstance | null | undefined,
  options: ViewModelInstancePropertyOptions<TProperty, TValue, TOperations, TExtended>,
  opts?: { injector?: Injector }
): ViewModelInstancePropertyResult<TValue, TOperations, TExtended> {
  if (!opts?.injector) assertInInjectionContext(createViewModelInstanceProperty);
  const injector = opts?.injector ?? inject(Injector);

  return runInInjectionContext(injector, () => {
    const readPath = (): string => (typeof path === 'function' ? path() : path);
    const readVmi = (): ViewModelInstance | null | undefined =>
      typeof vmi === 'function' ? vmi() : vmi;

    const resolvedProperty: WritableSignal<TProperty | null> = signal<TProperty | null>(null);
    const value: WritableSignal<TValue | null> = signal<TValue | null>(options.defaultValue);
    const extendedData: WritableSignal<TExtended | null> = signal<TExtended | null>(null);

    subscribeToPropertyChanges({ readPath, readVmi, resolvedProperty, value, extendedData, options });

    const safeAccess = buildSafeAccess({
      readPath,
      readVmi,
      resolvedProperty,
      extendedData,
      options,
    });

    const operations = options.buildPropertyOperations(safeAccess);
    const base = { ...operations, value: value.asReadonly() };
    return (
      options.getExtendedData
        ? { ...base, extendedData: extendedData.asReadonly() }
        : base
    ) as ViewModelInstancePropertyResult<TValue, TOperations, TExtended>;
  });
}

interface SubscribeArgs<TProperty, TValue, TOperations, TExtended> {
  readPath: () => string;
  readVmi: () => ViewModelInstance | null | undefined;
  resolvedProperty: WritableSignal<TProperty | null>;
  value: WritableSignal<TValue | null>;
  extendedData: WritableSignal<TExtended | null>;
  options: ViewModelInstancePropertyOptions<TProperty, TValue, TOperations, TExtended>;
}

/**
 * Registers an effect that keeps `value` / `extendedData` in sync with the
 * underlying Rive property. Re-resolves whenever the path or VMI change.
 */
function subscribeToPropertyChanges<
  TProperty extends ViewModelInstanceValue,
  TValue,
  TOperations,
  TExtended
>(args: SubscribeArgs<TProperty, TValue, TOperations, TExtended>): void {
  const { readPath, readVmi, resolvedProperty, value, extendedData, options } = args;

  effect((onCleanup) => {
    const instance = readVmi();
    const currentPath = readPath();
    if (!instance || !currentPath) {
      resetAll(resolvedProperty, value, extendedData, options.defaultValue);
      return;
    }

    const prop = options.getProperty(instance, currentPath);
    if (!prop) return;

    syncInitialState(prop, resolvedProperty, value, extendedData, options);
    subscribeToChangeEvents(prop, value, extendedData, options, onCleanup);
  });
}

function resetAll<TProperty, TValue, TExtended>(
  resolvedProperty: WritableSignal<TProperty | null>,
  value: WritableSignal<TValue | null>,
  extendedData: WritableSignal<TExtended | null>,
  defaultValue: TValue | null
): void {
  resolvedProperty.set(null);
  value.set(defaultValue);
  extendedData.set(null);
}

function syncInitialState<TProperty, TValue, TOperations, TExtended>(
  prop: TProperty,
  resolvedProperty: WritableSignal<TProperty | null>,
  value: WritableSignal<TValue | null>,
  extendedData: WritableSignal<TExtended | null>,
  options: ViewModelInstancePropertyOptions<TProperty, TValue, TOperations, TExtended>
): void {
  resolvedProperty.set(prop);
  value.set(options.getValue(prop));
  if (options.getExtendedData) extendedData.set(options.getExtendedData(prop));
}

function subscribeToChangeEvents<TProperty extends ViewModelInstanceValue, TValue, TOperations, TExtended>(
  prop: TProperty,
  value: WritableSignal<TValue | null>,
  extendedData: WritableSignal<TExtended | null>,
  options: ViewModelInstancePropertyOptions<TProperty, TValue, TOperations, TExtended>,
  onCleanup: (fn: () => void) => void
): void {
  const handleChange = (): void => {
    value.set(options.getValue(prop));
    if (options.getExtendedData) extendedData.set(options.getExtendedData(prop));
    options.onPropertyEvent?.();
  };

  safeInvoke(() => prop.on(handleChange));
  onCleanup(() => safeInvoke(() => prop.off(handleChange)));
}

interface SafeAccessArgs<TProperty, TValue, TOperations, TExtended> {
  readPath: () => string;
  readVmi: () => ViewModelInstance | null | undefined;
  resolvedProperty: WritableSignal<TProperty | null>;
  extendedData: WritableSignal<TExtended | null>;
  options: ViewModelInstancePropertyOptions<TProperty, TValue, TOperations, TExtended>;
}

/**
 * Builds the setter-side helper: fast path via cached property reference,
 * with a silent fresh-fetch fallback to survive hot reload. Captures and
 * returns the callback's return value so operations like `addInstanceAt`
 * can surface a boolean without an imperative `let` dance. All internal
 * signal reads are `untracked()` so user code may call `setValue()` from
 * inside their own effect without tracking our bookkeeping signals.
 */
function buildSafeAccess<
  TProperty extends ViewModelInstanceValue,
  TValue,
  TOperations,
  TExtended
>(
  args: SafeAccessArgs<TProperty, TValue, TOperations, TExtended>
): <TReturn>(callback: (prop: TProperty) => TReturn) => TReturn | undefined {
  const { readPath, readVmi, resolvedProperty, extendedData, options } = args;

  return <TReturn>(callback: (prop: TProperty) => TReturn): TReturn | undefined => {
    let captured: TReturn | undefined;
    untracked(() => {
      const cachedProp = resolvedProperty();
      const currentInstance = readVmi();
      if (cachedProp && currentInstance) {
        try {
          captured = callback(cachedProp);
          if (options.getExtendedData) extendedData.set(options.getExtendedData(cachedProp));
          return;
        } catch {
          /* fall through to fresh fetch */
        }
      }
      if (!currentInstance) return;
      try {
        const fresh = options.getProperty(currentInstance, readPath());
        if (!fresh) return;
        resolvedProperty.set(fresh);
        captured = callback(fresh);
        if (options.getExtendedData) extendedData.set(options.getExtendedData(fresh));
      } catch {
        /* swallow hot-reload errors */
      }
    });
    return captured;
  };
}

/** Invokes `fn` and silently swallows any error — used for best-effort cleanup. */
function safeInvoke(fn: () => void): void {
  try {
    fn();
  } catch {
    /* noop */
  }
}
