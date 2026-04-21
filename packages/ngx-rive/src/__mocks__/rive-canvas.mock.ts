// Manual mock for @rive-app/canvas used by tests. Keeps a shared instance that
// specs can drive via `fireLoad()` / `fireLoadError()`.
const loadListeners = new Set<() => void>();
const errorListeners = new Set<(err: unknown) => void>();

export const mockRiveInstance = {
  on: jest.fn((event: string, cb: (...a: unknown[]) => void) => {
    if (event === 'load') loadListeners.add(cb as () => void);
    if (event === 'loaderror') errorListeners.add(cb as (err: unknown) => void);
  }),
  off: jest.fn((event: string, cb: (...a: unknown[]) => void) => {
    if (event === 'load') loadListeners.delete(cb as () => void);
    if (event === 'loaderror') errorListeners.delete(cb as (err: unknown) => void);
  }),
  stop: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  cleanup: jest.fn(),
  startRendering: jest.fn(),
  stopRendering: jest.fn(),
  resizeToCanvas: jest.fn(),
  stateMachineInputs: jest.fn(),
  animationNames: [],
  isPlaying: false,
  isPaused: false,
  bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
  layout: null as unknown,
};

export const fireLoad = (): void => loadListeners.forEach((cb) => cb());
export const fireLoadError = (err: unknown = new Error('load error')): void =>
  errorListeners.forEach((cb) => cb(err));
export const resetMockRive = (): void => {
  loadListeners.clear();
  errorListeners.clear();
  Object.values(mockRiveInstance).forEach((v) => {
    if (typeof v === 'function' && 'mockClear' in (v as jest.Mock)) (v as jest.Mock).mockClear();
  });
  mockRiveInstance.stateMachineInputs = jest.fn();
};

export const Rive = jest.fn().mockImplementation(() => mockRiveInstance);
export const RiveFile = jest.fn().mockImplementation(() => ({
  init: jest.fn(),
  getInstance: jest.fn(),
  cleanup: jest.fn(),
  on: jest.fn(),
}));
export const Layout = jest.fn();
export const Fit = { Layout: 'layout', Cover: 'cover', Contain: 'contain' };
export const Alignment = { Center: 'center' };
export const EventType = { Load: 'load', LoadError: 'loaderror', RiveEvent: 'riveevent' };
export const RiveEventType = { General: 'general' };
export const StateMachineInputType = { Number: 1, Boolean: 2, Trigger: 3 };
