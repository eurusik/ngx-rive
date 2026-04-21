import { ChangeDetectionStrategy, Component, computed, signal, viewChild } from '@angular/core';
import { NgxRiveDirective, decodeImage } from 'ngx-rive';

/**
 * Demonstrates `binding.image('image').setValue(...)` — fetch a remote image,
 * decode via `decodeImage`, and swap it into the Rive artboard at runtime.
 */
@Component({
  selector: 'app-image-binding',
  standalone: true,
  imports: [NgxRiveDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host { display: block; }
      .stage { width: 400px; height: 400px; }
      canvas { display: block; width: 100%; height: 100%; }
      button { margin-top: 1rem; font: inherit; padding: 0.25rem 0.75rem; }
      [data-testid='status'] { font-family: monospace; margin-top: 0.5rem; font-size: 0.9rem; opacity: 0.8; }
    `,
  ],
  template: `
    <h2>Image binding</h2>
    <p>
      Load a random image via <code>fetch</code> + <code>decodeImage</code>, then swap it into the
      Rive artboard using <code>binding.image('image').setValue(decoded)</code>.
    </p>
    <div class="stage">
      <canvas
        ngxRive
        src="/assets/image_db_test.riv"
        artboard="Artboard"
        stateMachines="State Machine 1"
        [autoplay]="true"
        [autoBind]="false"
        #r="ngxRive"
        aria-label="Image binding demo"
      ></canvas>
    </div>
    <button data-testid="load-image" (click)="loadRandomImage()" [disabled]="isLoading()">
      {{ isLoading() ? 'Loading…' : 'Load random image' }}
    </button>
    <p data-testid="status">{{ status() }}</p>
  `,
})
export class ImageBindingComponent {
  private readonly riveDir = viewChild.required(NgxRiveDirective);

  protected readonly isLoading = signal(false);
  protected readonly status = signal<string>('No image loaded yet.');

  private readonly binding = computed(() =>
    this.riveDir().bind({ viewModel: 'Post', autoBind: true })
  );

  async loadRandomImage(): Promise<void> {
    this.isLoading.set(true);
    this.status.set('Fetching…');
    try {
      const url = `https://picsum.photos/400/300?random=${Date.now()}`;
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const decoded = await decodeImage(new Uint8Array(buffer));

      this.binding().image('image').setValue(decoded);
      decoded.unref();
      this.status.set(`Loaded ${url}`);
    } catch (err) {
      this.status.set(`Failed: ${(err as Error).message}`);
    } finally {
      this.isLoading.set(false);
    }
  }
}
