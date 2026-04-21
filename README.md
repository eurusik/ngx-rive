# ngx-rive

Angular bindings for [Rive](https://rive.app) — drop a `.riv` file into your app and interact with its view-model properties through native signals, while the library handles WASM lifecycle, DPR-aware resizing, and off-screen pause.

## Compatibility

| Package            | Version            |
| ------------------ | ------------------ |
| `@angular/core`    | `^19.0 \|\| ^20.0` |
| `@angular/common`  | `^19.0 \|\| ^20.0` |
| `@rive-app/canvas` | `^2.37`            |

All three are `peerDependencies`. The library is standalone-only — no `NgModule`. Primary test matrix is Angular 20 + `@angular/ssr`; Angular 19 is supported on a best-effort basis — code uses only APIs stable in both versions. Only the default Rive runtime (`@rive-app/canvas`) is supported; `@rive-app/webgl2` and `@rive-app/canvas-lite` are not. See the [SSR section](#ssr) for hydration details.

## Install

```bash
npm install ngx-rive @rive-app/canvas
```

## Why ngx-rive

`@rive-app/canvas` is the official Rive runtime — perfectly usable from Angular on its own, but it leaves the lifecycle, resizing, and view-model wiring to you. ngx-rive adds:

- **Signal-first API.** Property values, state-machine inputs, container size, and DPR are all `Signal<T>` — they compose directly with `computed()` and `effect()` without any Observable bridge.
- **Automatic lifecycle.** `DestroyRef`-based cleanup of WASM + listeners, DPR-aware canvas resizing via `ResizeObserver`, and off-screen pause via a shared `IntersectionObserver`.
- **SSR-safe.** Works with `@angular/ssr`; hydration is verified end-to-end. Details in the [SSR section](#ssr).

## Quick start

The `<ngx-rive>` wrapper is a thin sugar around the directive and is enough for "load a `.riv` file and play it":

```ts
import { Component } from '@angular/core';
import { NgxRiveComponent } from 'ngx-rive';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgxRiveComponent],
  styles: ['ngx-rive { display: block; width: 400px; height: 400px; }'],
  template: `<ngx-rive src="/assets/avatar.riv" artboard="Avatar" ariaLabel="Avatar" />`,
})
export class AppComponent {}
```

## Data binding

For view-model access, use the `NgxRiveDirective` directly — it exposes `bind()` which returns a `NgxRiveBinding`. Property refs are signal-backed and cached per path:

```ts
import { Component, computed, effect, viewChild } from '@angular/core';
import { NgxRiveDirective } from 'ngx-rive';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgxRiveDirective],
  styles: ['canvas { display: block; width: 600px; height: 400px; }'],
  template: `
    <canvas
      ngxRive
      src="/assets/stocks.riv"
      artboard="Main"
      stateMachines="State Machine 1"
      [autoBind]="false"
    ></canvas>
  `,
})
export class DashboardComponent {
  private readonly riveDir = viewChild.required(NgxRiveDirective);

  private readonly binding = computed(() =>
    this.riveDir().bind({ viewModel: 'Dashboard', autoBind: true })
  );

  readonly appleColor = computed(() =>
    this.binding().color('apple/currentColor').value()
  );

  constructor() {
    effect(() => {
      const dashboard = this.binding();
      if (!dashboard.viewModelInstance()) return;
      dashboard.string('title').setValue('Rive Stocks Dashboard');
      dashboard.enum('logoShape').setValue('triangle');
      dashboard.trigger('spin').trigger();
    });
  }
}
```

`bind()` returns the same instance for the same parameters, and each property factory (`number`, `string`, `boolean`, `color`, `enum`, `trigger`, `image`, `list`, `artboard`) returns a stable reactive ref.

## API

Primary:

| Export             | What it is                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `NgxRiveComponent` | `<ngx-rive>` wrapper. Standalone, `OnPush`, forwards `riveReady` / `riveLoadError` outputs.         |
| `NgxRiveDirective` | `canvas[ngxRive]` directive. Owns the `Rive` instance; exposes `rive`, `bind`, `stateMachineInput`. |
| `NgxRiveBinding`   | Returned by `directive.bind(params?)`. Typed factories for view-model properties.                   |

Advanced (internal building blocks, exported for power users):

| Export                        | Purpose                                                                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `riveFile(params)`            | Pre-load and share a `RiveFile` across components. Returns `{ riveFile: Signal<RiveFile \| null>, status: Signal<FileStatus> }`.                |
| `NgxRiveIntersectionObserver` | Shared viewport observer service used by the directive. Injectable if you need to piggy-back on the same observer.                              |
| `devicePixelRatio()`          | Reactive DPR signal; clamped to `[1, 3]`; reacts to screen changes via `matchMedia`.                                                            |
| `containerSize()`             | Reactive `ResizeObserver` wrapper with a window-resize fallback.                                                                                |
| `resizeCanvas(props)`         | DPR-aware canvas sizing used internally by the directive.                                                                                       |

All Rive runtime types (`Rive`, `RiveFile`, `Layout`, `Fit`, `EventType`, `StateMachineInput`, etc.) are re-exported for convenience so you only need one import.

### `bind()` parameters

```ts
directive.bind();                                                   // default view model + instance
directive.bind({ viewModel: 'Dashboard' });                         // named view model
directive.bind({ viewModel: 'Dashboard', instance: 'new' });        // fresh instance
directive.bind({ viewModel: 'Dashboard', instance: { name: 'Alt' }});
directive.bind({ autoBind: false });                                // resolve but don't bind to Rive
```

Calling `bind()` with the same parameters returns the same binding, so it is safe to call from inside a `computed()` or `effect()` without creating duplicate subscriptions to the view model.

### `NgxRiveBinding` property factories

| Factory                          | Returns                                                                                                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.number(path)`                  | `{ value: Signal<number \| null>, setValue }`                                                                                                                                |
| `.string(path)`                  | `{ value: Signal<string \| null>, setValue }`                                                                                                                                |
| `.boolean(path)`                 | `{ value: Signal<boolean \| null>, setValue }`                                                                                                                               |
| `.color(path)`                   | `{ value: Signal<number \| null>, setValue, setRgb, setRgba, setAlpha, setOpacity }`                                                                                         |
| `.enum(path)`                    | `{ value: Signal<string \| null>, values: Signal<string[]>, setValue }` — `values` holds the allowed options                                                                 |
| `.trigger(path, { onTrigger? })` | `{ trigger }` — `onTrigger` fires whenever the underlying Rive trigger emits                                                                                                 |
| `.image(path)`                   | `{ setValue }`                                                                                                                                                               |
| `.list(path)`                    | `{ length: Signal<number>, addInstance, addInstanceAt, removeInstance, removeInstanceAt, getInstanceAt, swap }`                                                              |
| `.artboard(path)`                | `{ setValue }`                                                                                                                                                               |

All mutations (`setValue`, `setRgba`, `trigger`, `addInstance`, …) are safe to call from inside a consumer `effect()` — internal signal reads go through `untracked`, so your effect won't accidentally track the binding's bookkeeping state.

Typical use — access the binding from inside an `effect()` or `computed()` so view-child resolution happens post-init:

```ts
constructor() {
  effect(() => {
    const dashboard = this.binding();
    if (!dashboard.viewModelInstance()) return;

    dashboard.string('title').setValue('Hello');
    dashboard.color('brand').setRgba(255, 128, 0, 255);
    dashboard.trigger('spin').trigger();
  });

  effect(() => {
    const score = this.binding().number('score').value();
    console.log('score is', score);
  });
}
```

## Examples

The playground app in this repo exercises every feature end-to-end:

| Route                   | Demonstrates                                                                |
| ----------------------- | --------------------------------------------------------------------------- |
| `/simple`               | Basic `<ngx-rive>` usage with `aria-label`.                                 |
| `/data-binding`         | Named view model, typed property bindings, triggers.                        |
| `/events`               | `EventType.RiveEvent` listeners from the directive.                         |
| `/responsive-layout`    | `Fit.Layout` with container-driven sizing.                                  |
| `/scroll`               | `IntersectionObserver` pause / resume.                                      |
| `/error-recovery`       | `riveLoadError` output and src re-assignment.                               |
| `/remote`               | Remote `.riv` file loaded from a public CDN.                                |
| `/state-machine-input`  | `directive.stateMachineInput(sm, name)` driving a slider-controlled input.  |
| `/list-binding`         | `binding.list(path)` with add / insert / remove / swap UI.                  |
| `/image-binding`        | `binding.image(path).setValue()` swapping a fetched + decoded image.        |

Run it locally (SSR dev server on `http://localhost:4200`):

```bash
npm run serve
```

## SSR

Every DOM API is guarded (`isPlatformBrowser`, `typeof globalThis`, matchMedia / ResizeObserver / IntersectionObserver defensive checks). On the server the directive's constructor early-returns, so no effects register, no WASM is loaded, and no listeners are attached. The `<canvas>` element itself ships in the server-rendered HTML and Rive boots on the client after hydration.

Hydration is verified via Playwright against `@angular/ssr` on Chromium, Firefox, and WebKit — no `NG0500` / `NG0501` mismatches on any route, and the data-binding pipeline still fires post-hydration.

## Testing

```bash
npm run test:lib     # jest, 177 unit + integration tests (mocked @rive-app/canvas)
npm run test:e2e     # playwright, 24 scenarios × 3 browsers (Chromium, Firefox, WebKit)
```

The E2E suite covers: basic rendering, data binding through the full pipeline, IntersectionObserver pause/resume, responsive resize, error recovery, navigation cleanup, SSR hydration, and a visual-regression guard that catches blank/crashed canvases.

## License

MIT

