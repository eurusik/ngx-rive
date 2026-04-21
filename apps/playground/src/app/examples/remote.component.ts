import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgxRiveComponent } from 'ngx-rive';

@Component({
  selector: 'app-remote',
  standalone: true,
  imports: [NgxRiveComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: block; } ngx-rive { display: block; width: 400px; height: 400px; }'],
  template: `
    <h2>Remote URL</h2>
    <p>
      <code>src</code> can point to any HTTP(S) URL — here we load Rive's public vehicles demo
      straight from their CDN.
    </p>
    <ngx-rive
      src="https://cdn.rive.app/animations/vehicles.riv"
      stateMachines="bumpy"
      ariaLabel="Remote vehicles animation"
    />
  `,
})
export class RemoteComponent {}
