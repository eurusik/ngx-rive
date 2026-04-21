import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NgxRiveComponent } from 'ngx-rive';

@Component({
  selector: 'app-error-recovery',
  standalone: true,
  imports: [NgxRiveComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host { display: block; }
      ngx-rive { display: block; width: 400px; height: 400px; }
      button { margin-top: 0.5rem; }
    `,
  ],
  template: `
    <h2>Error Recovery</h2>
    <p>Demonstrates <code>riveLoadError</code> output and src re-assignment recovery.</p>
    <p data-testid="status">Status: <strong>{{ status() }}</strong></p>
    <button data-testid="fix" (click)="loadValid()">Load valid file</button>
    <ngx-rive
      [src]="src()"
      artboard="Avatar 3"
      ariaLabel="Error recovery demo"
      (riveReady)="onReady()"
      (riveLoadError)="onError()"
    />
  `,
})
export class ErrorRecoveryComponent {
  readonly src = signal('/assets/does-not-exist.riv');
  readonly status = signal<'loading' | 'error' | 'ready'>('loading');

  loadValid(): void {
    this.status.set('loading');
    this.src.set('/assets/avatars.riv');
  }

  onReady(): void {
    this.status.set('ready');
  }

  onError(): void {
    this.status.set('error');
  }
}
