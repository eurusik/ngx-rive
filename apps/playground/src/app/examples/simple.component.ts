import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgxRiveComponent } from 'ngx-rive';

@Component({
  selector: 'app-simple',
  standalone: true,
  imports: [NgxRiveComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: block; } ngx-rive { display: block; width: 400px; height: 400px; }'],
  template: `
    <h2>Simple</h2>
    <p>Basic animation playback — Rive file loaded via the wrapper component.</p>
    <ngx-rive src="/assets/avatars.riv" artboard="Avatar 3" ariaLabel="Avatar animation" />
  `,
})
export class SimpleComponent {}
