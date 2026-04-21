import {
  Injector,
  Signal,
  assertInInjectionContext,
  effect,
  inject,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { EventType, RiveFile } from '@rive-app/canvas';
import type { FileStatus, NgxRiveFileParameters, NgxRiveFileState } from './types';

/**
 * Loads a RiveFile and exposes its lifecycle as signals. Re-creates when
 * `params.src` or `params.buffer` change. Mirrors `useRiveFile` from rive-react.
 */
export function riveFile(
  params: Signal<NgxRiveFileParameters> | NgxRiveFileParameters,
  opts?: { injector?: Injector }
): NgxRiveFileState {
  if (!opts?.injector) assertInInjectionContext(riveFile);
  const injector = opts?.injector ?? inject(Injector);

  return runInInjectionContext(injector, () => {
    const file = signal<RiveFile | null>(null);
    const status = signal<FileStatus>('idle');

    const readParams = (): NgxRiveFileParameters =>
      typeof params === 'function' ? params() : params;

    let lastSrc: string | undefined;
    let lastBuffer: ArrayBuffer | undefined;

    effect((onCleanup) => {
      const p = readParams();
      if (p.src === lastSrc && p.buffer === lastBuffer && file() != null) return;
      lastSrc = p.src;
      lastBuffer = p.buffer;

      let current: RiveFile | null = null;
      try {
        status.set('loading');
        current = new RiveFile(p);
        current.init();
        current.on(EventType.Load, () => {
          current?.getInstance();
          file.set(current);
          status.set('success');
        });
        current.on(EventType.LoadError, () => {
          file.set(null);
          status.set('failed');
        });
      } catch (error) {
        console.error(error);
        status.set('failed');
      }

      onCleanup(() => {
        current?.cleanup();
      });
    });

    return { riveFile: file.asReadonly(), status: status.asReadonly() };
  });
}
