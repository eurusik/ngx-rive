import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  viewChild,
} from '@angular/core';
import { NgxRiveDirective } from 'ngx-rive';

const random = () => Math.random() * 200 - 100;

@Component({
  selector: 'app-data-binding',
  standalone: true,
  imports: [NgxRiveDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host { display: block; }
      .stage { width: 600px; height: 400px; }
      canvas { display: block; width: 100%; height: 100%; }
    `,
  ],
  template: `
    <h2>Data Binding</h2>
    <p>Values tick every 2 seconds; spin trigger fires when all three stocks move the same direction.</p>
    <div class="stage">
      <canvas
        ngxRive
        src="/assets/stocks.riv"
        artboard="Main"
        stateMachines="State Machine 1"
        [autoplay]="true"
        [autoBind]="false"
        #r="ngxRive"
        aria-label="Animated stock dashboard"
      ></canvas>
    </div>
  `,
})
export class DataBindingComponent {
  private readonly riveDir = viewChild.required(NgxRiveDirective);

  /** Binding to the `Dashboard` view model, auto-bound to the Rive instance. */
  private readonly binding = computed(() =>
    this.riveDir().bind({ viewModel: 'Dashboard', autoBind: true })
  );

  /** Reactive log of Apple's colour property — updates when Rive mutates it. */
  readonly appleColor = computed(() => this.binding()?.color('apple/currentColor').value());

  constructor() {
    // Register the button-trigger listener once — survives re-renders because
    // `NgxRiveBinding` caches property refs by path.
    effect(() => {
      const b = this.binding();
      if (!b) return;
      b.trigger('triggerButton', { onTrigger: () => console.log('Button Triggered!') });
    });

    // Seed initial values + run a 2-second tick loop once VMI resolves.
    effect((onCleanup) => {
      const b = this.binding();
      if (!b?.viewModelInstance()) return;

      b.string('title').setValue('Rive Stocks Dashboard');
      b.enum('logoShape').setValue('triangle');
      b.color('rootColor').setValue(parseInt('ffc0ffee', 16));
      b.string('apple/name').setValue('AAPL');
      b.string('microsoft/name').setValue('MSFT');
      b.string('tesla/name').setValue('TSLA');

      const interval = setInterval(() => {
        const apple = random();
        const msft = random();
        const tesla = random();
        b.number('apple/stockChange').setValue(apple);
        b.number('microsoft/stockChange').setValue(msft);
        b.number('tesla/stockChange').setValue(tesla);
        const allUp = apple > 0 && msft > 0 && tesla > 0;
        const allDown = apple < 0 && msft < 0 && tesla < 0;
        if (allUp || allDown) b.trigger('triggerSpinLogo').trigger();
      }, 2000);
      onCleanup(() => clearInterval(interval));
    });

    // Log Apple colour changes.
    effect(() => {
      const c = this.appleColor();
      if (c != null) console.log('Apple color changed:', c);
    });
  }
}
