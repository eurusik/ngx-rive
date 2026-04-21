import { ChangeDetectionStrategy, Component, effect, viewChild } from '@angular/core';
import { EventType, NgxRiveDirective, RiveEventType } from 'ngx-rive';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [NgxRiveDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: block; } .stage { width: 400px; height: 400px; }'],
  template: `
    <h2>Events</h2>
    <p>Click a star to emit a <code>RiveEvent</code>. Check the console for details.</p>
    <div class="stage">
      <canvas
        ngxRive
        src="/assets/rating.riv"
        stateMachines="State Machine 1"
        [autoplay]="true"
        [automaticallyHandleEvents]="true"
        #r="ngxRive"
        aria-label="Star rating animation"
      ></canvas>
    </div>
  `,
})
export class EventsComponent {
  private readonly riveDir = viewChild.required(NgxRiveDirective);

  constructor() {
    effect((onCleanup) => {
      const rive = this.riveDir().rive();
      if (!rive) return;
      const handler = (event: unknown) => {
        const riveEvent = event as { data?: { type: unknown; name: string; properties: Record<string, unknown> } };
        const data = riveEvent.data;
        console.log('Rive event received:', event);
        if (data?.type === RiveEventType.General) {
          console.log('Event name:', data.name);
          console.log('Rating:', data.properties['rating']);
          console.log('Message:', data.properties['message']);
        }
      };
      rive.on(EventType.RiveEvent, handler);
      onCleanup(() => rive.off(EventType.RiveEvent, handler));
    });
  }
}
