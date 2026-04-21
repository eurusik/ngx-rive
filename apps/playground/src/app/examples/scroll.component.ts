import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgxRiveComponent } from 'ngx-rive';

@Component({
  selector: 'app-scroll',
  standalone: true,
  imports: [NgxRiveComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host { display: block; }
      .spacer { height: 150vh; background: repeating-linear-gradient(
        to bottom,
        rgba(128, 128, 128, 0.05) 0 20px,
        transparent 20px 40px
      ); }
      ngx-rive { display: block; width: 400px; height: 400px; margin: 2rem auto; }
    `,
  ],
  template: `
    <h2>Scroll (IntersectionObserver pause/resume)</h2>
    <p>Scroll down — the canvas pauses rendering when off-screen and resumes when visible.</p>
    <div class="spacer" data-testid="spacer-top"></div>
    <ngx-rive src="/assets/avatars.riv" artboard="Avatar 3" ariaLabel="Scroll intersection demo" />
    <div class="spacer" data-testid="spacer-bottom"></div>
  `,
})
export class ScrollComponent {}
