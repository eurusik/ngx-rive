import { ChangeDetectionStrategy, Component, computed, effect, viewChild } from '@angular/core';
import { NgxRiveDirective } from 'ngx-rive';

/**
 * Demonstrates `NgxRiveDirective.stateMachineInput(sm, name, initialValue?)`.
 * The factory resolves a reactive `Signal<StateMachineInput | null>` that stays
 * null until Rive loads and the named input is found. Changing `inputValue`
 * propagates to Rive in real time.
 */
@Component({
  selector: 'app-state-machine-input',
  standalone: true,
  imports: [NgxRiveDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host { display: block; }
      .stage { width: 400px; height: 400px; }
      canvas { display: block; width: 100%; height: 100%; }
      .controls { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem; }
      label { display: flex; align-items: center; gap: 0.75rem; font-family: monospace; }
      input[type='range'] { flex: 1; }
      [data-testid='status'] { font-family: monospace; font-size: 0.9rem; opacity: 0.7; }
    `,
  ],
  template: `
    <h2>State Machine Input</h2>
    <p>
      Drive a named state-machine input from Angular. Replace <code>rating</code> with any input
      your own <code>.riv</code> exposes.
    </p>
    <div class="stage">
      <canvas
        ngxRive
        src="/assets/rating.riv"
        stateMachines="State Machine 1"
        [autoplay]="true"
        #r="ngxRive"
        aria-label="Rating animation controlled by a state-machine input"
      ></canvas>
    </div>
    <div class="controls">
      <label>
        rating
        <input
          data-testid="rating-slider"
          type="range"
          min="0"
          max="5"
          step="1"
          [value]="currentValue()"
          (input)="setValue(+$any($event.target).value)"
        />
        <span data-testid="rating-value">{{ currentValue() ?? '—' }}</span>
      </label>
      <p data-testid="status">
        @if (ratingInput()) {
          Input resolved. Slide to mutate.
        } @else {
          Input <code>rating</code> not found in this Rive file — the signal stays null.
        }
      </p>
    </div>
  `,
})
export class StateMachineInputComponent {
  private readonly riveDir = viewChild.required(NgxRiveDirective);

  readonly ratingInput = computed(() =>
    this.riveDir().stateMachineInput('State Machine 1', 'rating')()
  );

  readonly currentValue = computed(() => this.ratingInput()?.value as number | undefined);

  constructor() {
    effect(() => {
      const input = this.ratingInput();
      if (input) console.log('state-machine input resolved:', input.name, input.value);
    });
  }

  setValue(v: number): void {
    const input = this.ratingInput();
    if (input) input.value = v;
  }
}
