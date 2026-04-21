# Changelog

All notable changes to `ngx-rive` are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
once it reaches 1.0.

## [Unreleased]

## [0.1.0-alpha.3] — 2026-04-21

### Changed

- Widen `@angular/core` and `@angular/common` peer ranges to
  `^19.0.0 || ^20.0.0`. The library uses only APIs stable in both versions
  (`input()`, `output()`, `viewChild`, `effect()` with `onCleanup`, `signal()`,
  `computed()`, `DestroyRef`, `@if`/`@for`), so consumers on Angular 19 can
  install without `--legacy-peer-deps`. Angular 20 remains the primary CI
  target.

## [0.1.0-alpha.2] — 2026-04-21

### Packaging

- Include `README.md`, `LICENSE`, and `CHANGELOG.md` in the published tarball
  so they surface on npmjs.com. No code changes from `0.1.0-alpha.1`.

## [0.1.0-alpha.1] — 2026-04-21

First public preview. The library is feature-complete for the use-cases listed
below but the API may still change before `1.0`.

### Added

- `NgxRiveDirective` — `canvas[ngxRive]` directive owning the `Rive` instance
  lifecycle, DPR-aware canvas resizing, and viewport-based rendering pause via
  a shared `IntersectionObserver`.
- `NgxRiveComponent` — standalone `<ngx-rive>` wrapper with forwarded
  `riveReady` / `riveLoadError` outputs and accessible host bindings.
- `NgxRiveBinding` with typed factories for all Rive view-model property types:
  `number`, `string`, `boolean`, `color`, `enum`, `trigger`, `image`, `list`,
  and `artboard`. Each returns a `Signal`-backed reactive ref.
- `list.version` — per-list mutation counter signal that ticks on every
  underlying Rive emit, including swaps and in-place updates that leave
  `length` unchanged.
- `stateMachineInput(sm, name, initial?)` factory on the directive for typed
  access to state-machine inputs as signals.
- `riveFile(params)` factory for pre-loading and sharing a `RiveFile` across
  components.
- Low-level helpers exported for advanced users: `devicePixelRatio()`,
  `containerSize()`, `resizeCanvas(props)`, and the
  `NgxRiveIntersectionObserver` service.
- SSR support via `@angular/ssr` — the `<canvas>` shell renders on the server
  and Rive boots on the client after hydration. Hydration is verified
  end-to-end across Chromium, Firefox, and WebKit.

### Tested

- 179 Jest unit + integration tests with a mocked `@rive-app/canvas`.
- 111 Playwright end-to-end tests across Chromium, Firefox, and WebKit:
  playground happy paths, SSR hydration, visual regression baselines, error
  recovery, scroll intersection, and full binding pipelines against real Rive
  WASM.

[Unreleased]: https://github.com/eurusik/ngx-rive/compare/v0.1.0-alpha.3...HEAD
[0.1.0-alpha.3]: https://github.com/eurusik/ngx-rive/releases/tag/v0.1.0-alpha.3
[0.1.0-alpha.2]: https://github.com/eurusik/ngx-rive/releases/tag/v0.1.0-alpha.2
[0.1.0-alpha.1]: https://github.com/eurusik/ngx-rive/releases/tag/v0.1.0-alpha.1
