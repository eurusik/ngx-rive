import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Fit, Layout, NgxRiveComponent } from 'ngx-rive';

@Component({
  selector: 'app-responsive-layout',
  standalone: true,
  imports: [NgxRiveComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host { display: block; }
      .stage { resize: both; overflow: hidden; border: 1px dashed rgba(128,128,128,0.5); min-width: 320px; min-height: 240px; width: 640px; height: 480px; }
      ngx-rive { display: block; width: 100%; height: 100%; }
    `,
  ],
  template: `
    <h2>Responsive Layout</h2>
    <p>Drag the bottom-right corner to resize — the artboard reflows via <code>Fit.Layout</code>.</p>
    <div class="stage">
      <ngx-rive
        src="/assets/layout_test.riv"
        artboard="Artboard"
        stateMachines="State Machine 1"
        [layout]="layout"
        ariaLabel="Responsive Rive layout demo"
      />
    </div>
  `,
})
export class ResponsiveLayoutComponent {
  readonly layout = new Layout({ fit: Fit.Layout });
}
