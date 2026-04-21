import { Injectable, isDevMode } from '@angular/core';

const MISSING_CALLBACK_WARNING = '[ngx-rive] IntersectionObserver callback missing for element.';

class FakeIntersectionObserver {
  constructor(_callback: IntersectionObserverCallback) {}
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

function getObserverConstructor(): typeof IntersectionObserver {
  if (typeof globalThis !== 'undefined' && globalThis.IntersectionObserver) {
    return globalThis.IntersectionObserver;
  }
  return FakeIntersectionObserver as unknown as typeof IntersectionObserver;
}

export type IntersectionCallback = (entry: IntersectionObserverEntry) => void;

@Injectable({ providedIn: 'root' })
export class NgxRiveIntersectionObserver {
  private observer?: IntersectionObserver;
  private readonly callbacksByElement = new Map<Element, IntersectionCallback>();

  observe(element: Element, callback: IntersectionCallback): void {
    this.ensureObserver();
    this.callbacksByElement.set(element, callback);
    this.observer!.observe(element);
  }

  unobserve(element: Element): void {
    this.observer?.unobserve(element);
    this.callbacksByElement.delete(element);
  }

  private ensureObserver(): void {
    if (this.observer) return;
    const Ctor = getObserverConstructor();
    this.observer = new Ctor((entries) => this.handleEntries(entries));
  }

  private handleEntries(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      const callback = this.callbacksByElement.get(entry.target);
      if (callback) callback(entry);
      else if (isDevMode()) console.warn(MISSING_CALLBACK_WARNING);
    }
  }
}
