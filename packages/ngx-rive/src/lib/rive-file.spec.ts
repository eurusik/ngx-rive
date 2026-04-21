import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RiveFile } from '../__mocks__/rive-canvas.mock';
import { riveFile } from './rive-file';

describe('riveFile', () => {
  let injector: Injector;
  let loadCbs: (() => void)[];
  let errorCbs: (() => void)[];
  let fileInstance: {
    init: jest.Mock;
    getInstance: jest.Mock;
    cleanup: jest.Mock;
    on: jest.Mock;
  };

  beforeEach(() => {
    loadCbs = [];
    errorCbs = [];
    fileInstance = {
      init: jest.fn(),
      getInstance: jest.fn(),
      cleanup: jest.fn(),
      on: jest.fn((event: string, cb: () => void) => {
        if (event === 'load') loadCbs.push(cb);
        if (event === 'loaderror') errorCbs.push(cb);
      }),
    };
    (RiveFile as unknown as jest.Mock).mockImplementation(() => fileInstance);
    injector = TestBed.inject(Injector);
  });

  it('initializes a RiveFile and transitions to success on load', () => {
    runInInjectionContext(injector, () => {
      const state = riveFile({ src: 'file.riv' });
      TestBed.tick();
      expect(RiveFile).toHaveBeenCalledWith({ src: 'file.riv' });
      expect(fileInstance.init).toHaveBeenCalled();
      expect(state.status()).toBe('loading');

      loadCbs.forEach((cb) => cb());
      expect(fileInstance.getInstance).toHaveBeenCalled();
      expect(state.status()).toBe('success');
    });
  });

  it('transitions to failed on load error', () => {
    runInInjectionContext(injector, () => {
      const state = riveFile({ src: 'bad.riv' });
      TestBed.tick();
      errorCbs.forEach((cb) => cb());
      expect(state.status()).toBe('failed');
    });
  });
});
