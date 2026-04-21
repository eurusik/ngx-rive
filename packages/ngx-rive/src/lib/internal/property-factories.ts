import { Injector, Signal, computed, runInInjectionContext, signal } from '@angular/core';
import type {
  ViewModelInstance,
  ViewModelInstanceArtboard,
  ViewModelInstanceAssetImage,
  ViewModelInstanceBoolean,
  ViewModelInstanceColor,
  ViewModelInstanceEnum,
  ViewModelInstanceList,
  ViewModelInstanceNumber,
  ViewModelInstanceString,
  ViewModelInstanceTrigger,
  ViewModelInstanceValue,
} from '@rive-app/canvas';
import type {
  NgxRiveTriggerParams,
  RiveRenderImage,
  ViewModelInstanceArtboardResult,
  ViewModelInstanceBooleanResult,
  ViewModelInstanceColorResult,
  ViewModelInstanceEnumResult,
  ViewModelInstanceImageResult,
  ViewModelInstanceListResult,
  ViewModelInstanceNumberResult,
  ViewModelInstanceStringResult,
  ViewModelInstanceTriggerResult,
} from '../types';
import { createViewModelInstanceProperty } from './property-builder';

type ViewModelInstanceSignal = Signal<ViewModelInstance | null | undefined>;
type PropertyBuilderContext = { injector: Injector };

/** Shared read+write implementation for primitive property types (number, string, boolean). */
function buildPrimitiveProperty<P extends ViewModelInstanceValue & { value: V }, V>(
  path: string,
  vmi: ViewModelInstanceSignal,
  ctx: PropertyBuilderContext,
  getProperty: (vm: ViewModelInstance, p: string) => P | null
): { value: Signal<V | null>; setValue: (v: V) => void } {
  const result = createViewModelInstanceProperty<P, V, { setValue: (v: V) => void }>(
    path,
    vmi,
    {
      getProperty,
      getValue: (prop) => prop.value,
      defaultValue: null,
      buildPropertyOperations: (safe) => ({
        setValue: (v: V) => safe((prop) => {
          prop.value = v;
        }),
      }),
    },
    ctx
  );
  return { value: result.value, setValue: result.setValue };
}

/** Reactive binding for a number property. */
export function buildNumber(path: string, vmi: ViewModelInstanceSignal, ctx: PropertyBuilderContext): ViewModelInstanceNumberResult {
  return buildPrimitiveProperty<ViewModelInstanceNumber, number>(path, vmi, ctx, (vm, p) => vm.number(p));
}

/** Reactive binding for a string property. */
export function buildString(path: string, vmi: ViewModelInstanceSignal, ctx: PropertyBuilderContext): ViewModelInstanceStringResult {
  return buildPrimitiveProperty<ViewModelInstanceString, string>(path, vmi, ctx, (vm, p) => vm.string(p));
}

/** Reactive binding for a boolean property. */
export function buildBoolean(path: string, vmi: ViewModelInstanceSignal, ctx: PropertyBuilderContext): ViewModelInstanceBooleanResult {
  return buildPrimitiveProperty<ViewModelInstanceBoolean, boolean>(path, vmi, ctx, (vm, p) => vm.boolean(p));
}

/** Reactive binding for a color property — exposes `setRgb` / `setRgba` / `setAlpha` / `setOpacity` helpers. */
export function buildColor(path: string, vmi: ViewModelInstanceSignal, ctx: PropertyBuilderContext): ViewModelInstanceColorResult {
  type Ops = Omit<ViewModelInstanceColorResult, 'value'>;
  return createViewModelInstanceProperty<ViewModelInstanceColor, number, Ops>(
    path,
    vmi,
    {
      getProperty: (vm, p) => vm.color(p),
      getValue: (prop) => prop.value,
      defaultValue: null,
      buildPropertyOperations: (safe) => ({
        setValue: (v) => safe((prop) => {
          prop.value = v;
        }),
        setRgb: (red, green, blue) => safe((prop) => prop.rgb(red, green, blue)),
        setRgba: (red, green, blue, alpha) => safe((prop) => prop.rgba(red, green, blue, alpha)),
        setAlpha: (a) => safe((prop) => prop.alpha(a)),
        setOpacity: (o) => safe((prop) => prop.opacity(o)),
      }),
    },
    ctx
  );
}

/** Reactive binding for an enum property — exposes `values` (allowed options) as a signal. */
export function buildEnum(path: string, vmi: ViewModelInstanceSignal, ctx: PropertyBuilderContext): ViewModelInstanceEnumResult {
  const result = createViewModelInstanceProperty<
    ViewModelInstanceEnum,
    string,
    { setValue: (v: string) => void },
    string[]
  >(
    path,
    vmi,
    {
      getProperty: (vm, p) => vm.enum(p),
      getValue: (prop) => prop.value,
      defaultValue: null,
      getExtendedData: (prop) => prop.values,
      buildPropertyOperations: (safe) => ({
        setValue: (v) => safe((prop) => {
          prop.value = v;
        }),
      }),
    },
    ctx
  );
  return {
    value: result.value,
    setValue: result.setValue,
    values: runInInjectionContext(ctx.injector, () =>
      computed<string[]>(() => result.extendedData?.() ?? [])
    ),
  };
}

/** Reactive binding for a trigger property — fire-and-forget with an optional `onTrigger` callback. */
export function buildTrigger(
  path: string,
  vmi: ViewModelInstanceSignal,
  ctx: PropertyBuilderContext,
  params?: NgxRiveTriggerParams
): ViewModelInstanceTriggerResult {
  const { trigger } = createViewModelInstanceProperty<
    ViewModelInstanceTrigger,
    undefined,
    ViewModelInstanceTriggerResult
  >(
    path,
    vmi,
    {
      getProperty: (vm, p) => vm.trigger(p),
      getValue: () => undefined,
      defaultValue: null,
      onPropertyEvent: params?.onTrigger,
      buildPropertyOperations: (safe) => ({
        trigger: () => safe((prop) => prop.trigger()),
      }),
    },
    ctx
  );
  return { trigger };
}

/** Reactive binding for an image asset property — `setValue` swaps the decoded image. */
export function buildImage(path: string, vmi: ViewModelInstanceSignal, ctx: PropertyBuilderContext): ViewModelInstanceImageResult {
  return createViewModelInstanceProperty<
    ViewModelInstanceAssetImage,
    undefined,
    ViewModelInstanceImageResult
  >(
    path,
    vmi,
    {
      getProperty: (vm, p) => vm.image(p),
      getValue: () => undefined,
      defaultValue: null,
      buildPropertyOperations: (safe) => ({
        setValue: (v: RiveRenderImage | null) => safe((prop) => {
          prop.value = v;
        }),
      }),
    },
    ctx
  );
}

/** Reactive binding for a list property — exposes `length` signal + item CRUD helpers. */
export function buildList(path: string, vmi: ViewModelInstanceSignal, ctx: PropertyBuilderContext): ViewModelInstanceListResult {
  type Ops = Omit<ViewModelInstanceListResult, 'length' | 'version'>;
  // `length` only ticks on count changes, so swap / in-place edits would be
  // silent to downstream consumers. `version` increments on every emit from
  // `prop.on(handleChange)` so users can observe ordering mutations too.
  const version = runInInjectionContext(ctx.injector, () => signal(0));
  const result = createViewModelInstanceProperty<ViewModelInstanceList, number, Ops>(
    path,
    vmi,
    {
      getProperty: (vm, p) => vm.list(p),
      getValue: (prop) => prop.length,
      defaultValue: 0,
      onPropertyEvent: () => version.update((n) => n + 1),
      buildPropertyOperations: (safe) => ({
        addInstance: (instance) => safe((prop) => prop.addInstance(instance)),
        addInstanceAt: (instance, index) =>
          safe((prop) => prop.addInstanceAt(instance, index)) ?? false,
        removeInstance: (instance) => safe((prop) => prop.removeInstance(instance)),
        removeInstanceAt: (index) => safe((prop) => prop.removeInstanceAt(index)),
        getInstanceAt: (index) => safe((prop) => prop.instanceAt(index)) ?? null,
        swap: (a, b) => safe((prop) => prop.swap(a, b)),
      }),
    },
    ctx
  );
  return {
    length: runInInjectionContext(ctx.injector, () => computed<number>(() => result.value() ?? 0)),
    version: version.asReadonly(),
    addInstance: result.addInstance,
    addInstanceAt: result.addInstanceAt,
    removeInstance: result.removeInstance,
    removeInstanceAt: result.removeInstanceAt,
    getInstanceAt: result.getInstanceAt,
    swap: result.swap,
  };
}

/** Reactive binding for a nested artboard property. */
export function buildArtboard(
  path: string,
  vmi: ViewModelInstanceSignal,
  ctx: PropertyBuilderContext
): ViewModelInstanceArtboardResult {
  return createViewModelInstanceProperty<
    ViewModelInstanceArtboard,
    undefined,
    ViewModelInstanceArtboardResult
  >(
    path,
    vmi,
    {
      getProperty: (vm, p) => vm.artboard(p),
      getValue: () => undefined,
      defaultValue: null,
      buildPropertyOperations: (safe) => ({
        setValue: (v) => safe((prop) => {
          prop.value = v;
        }),
      }),
    },
    ctx
  );
}
