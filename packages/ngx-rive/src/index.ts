// Re-export the Rive runtime surface that consumers normally reach for.
// Keep this list explicit to avoid CJS `export *` interop issues under Vite.
export {
  Rive,
  RiveFile,
  Layout,
  Fit,
  Alignment,
  EventType,
  RiveEventType,
  StateMachineInputType,
  StateMachineInput,
  RuntimeLoader,
  decodeImage,
  decodeAudio,
  decodeFont,
} from '@rive-app/canvas';
export type {
  Bounds,
  RiveParameters,
  RiveFileParameters,
  LayoutParameters,
  AssetLoadCallback,
  FileAsset,
  AudioAsset,
  FontAsset,
  ImageAsset,
  VoidCallback,
  ViewModel,
  ViewModelInstance,
  ViewModelInstanceValue,
  ViewModelInstanceNumber,
  ViewModelInstanceString,
  ViewModelInstanceBoolean,
  ViewModelInstanceColor,
  ViewModelInstanceEnum,
  ViewModelInstanceTrigger,
  ViewModelInstanceList,
  ViewModelInstanceAssetImage,
  ViewModelInstanceArtboard,
} from '@rive-app/canvas';

// Public types
export * from './lib/types';

// Options utility
export { defaultNgxRiveOptions, getOptions } from './lib/utils';

// Services
export { NgxRiveIntersectionObserver } from './lib/intersection-observer.service';

// Low-level helpers (exported for advanced users)
export { devicePixelRatio } from './lib/device-pixel-ratio';
export { containerSize } from './lib/container-size';
export { resizeCanvas, type ResizeCanvasProps } from './lib/resize-canvas';
export { riveFile } from './lib/rive-file';

// Core classes
export { NgxRiveDirective } from './lib/rive.directive';
export { NgxRiveComponent } from './lib/rive.component';
export { NgxRiveBinding, type NgxRiveBindParams } from './lib/rive-binding';
