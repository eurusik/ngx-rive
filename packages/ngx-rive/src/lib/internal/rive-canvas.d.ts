// Type augmentation for @rive-app/canvas — fills in fields that exist at
// runtime but are missing from the published declarations. Remove each once
// upstream ships proper typings.
import '@rive-app/canvas';

declare module '@rive-app/canvas' {
  interface ViewModelInstanceEnum {
    /** Allowed enum values in declaration order. */
    readonly values: string[];
  }

  interface ViewModelInstanceArtboard {
    /** Writable artboard source. */
    value: unknown;
  }
}
