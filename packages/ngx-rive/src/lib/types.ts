import type {
  decodeImage,
  RiveFile,
  RiveFileParameters,
  ViewModelInstance,
  ViewModelInstanceArtboard,
} from '@rive-app/canvas';
import type { Signal } from '@angular/core';

export type NgxRiveOptions = {
  readonly useDevicePixelRatio: boolean;
  readonly customDevicePixelRatio: number;
  readonly fitCanvasToArtboardHeight: boolean;
  readonly useOffscreenRenderer: boolean;
  readonly shouldResizeCanvasToContainer: boolean;
  readonly shouldUseIntersectionObserver?: boolean;
};

export type Dimensions = {
  readonly width: number;
  readonly height: number;
};

export type NgxRiveFileParameters = Partial<
  Omit<RiveFileParameters, 'onLoad' | 'onLoadError'>
>;

export type FileStatus = 'idle' | 'loading' | 'failed' | 'success';

export type NgxRiveFileState = {
  riveFile: Signal<RiveFile | null>;
  status: Signal<FileStatus>;
};

/** Options for {@link NgxRiveBinding.trigger}. */
export type NgxRiveTriggerParams = {
  onTrigger?: () => void;
};

export type ViewModelInstanceNumberResult = {
  value: Signal<number | null>;
  setValue: (value: number) => void;
};
export type ViewModelInstanceStringResult = {
  value: Signal<string | null>;
  setValue: (value: string) => void;
};
export type ViewModelInstanceBooleanResult = {
  value: Signal<boolean | null>;
  setValue: (value: boolean) => void;
};
export type ViewModelInstanceColorResult = {
  value: Signal<number | null>;
  setValue: (value: number) => void;
  setRgb: (r: number, g: number, b: number) => void;
  setRgba: (r: number, g: number, b: number, a: number) => void;
  setAlpha: (a: number) => void;
  setOpacity: (o: number) => void;
};
export type ViewModelInstanceEnumResult = {
  value: Signal<string | null>;
  setValue: (value: string) => void;
  values: Signal<string[]>;
};
export type ViewModelInstanceTriggerResult = {
  trigger: () => void;
};

export type RiveRenderImage = Awaited<ReturnType<typeof decodeImage>>;

export type ViewModelInstanceImageResult = {
  setValue: (value: RiveRenderImage | null) => void;
};

export type ViewModelInstanceListResult = {
  length: Signal<number>;
  /**
   * Ticks on every list mutation, including swaps and in-place updates that
   * leave `length` unchanged. Read it from `computed()` / `effect()` when you
   * need to react to ordering changes, not just count changes.
   */
  version: Signal<number>;
  addInstance: (instance: ViewModelInstance) => void;
  addInstanceAt: (instance: ViewModelInstance, index: number) => boolean;
  removeInstance: (instance: ViewModelInstance) => void;
  removeInstanceAt: (index: number) => void;
  getInstanceAt: (index: number) => ViewModelInstance | null;
  swap: (a: number, b: number) => void;
};

export type ViewModelInstanceArtboardResult = {
  setValue: (
    value: ViewModelInstanceArtboard extends { value: infer T } ? T : never
  ) => void;
};
