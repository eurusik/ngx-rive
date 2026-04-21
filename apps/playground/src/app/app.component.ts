import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: grid;
        grid-template-rows: auto 1fr;
        height: 100vh;
      }
      nav {
        display: flex;
        gap: 1rem;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid rgba(128, 128, 128, 0.3);
      }
      nav a {
        text-decoration: none;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
      }
      nav a.active {
        background: rgba(128, 128, 128, 0.2);
      }
      main {
        padding: 1rem;
        overflow: auto;
      }
    `,
  ],
  template: `
    <nav>
      <a routerLink="simple" routerLinkActive="active">Simple</a>
      <a routerLink="data-binding" routerLinkActive="active">Data Binding</a>
      <a routerLink="events" routerLinkActive="active">Events</a>
      <a routerLink="responsive-layout" routerLinkActive="active">Responsive</a>
      <a routerLink="error-recovery" routerLinkActive="active">Error Recovery</a>
      <a routerLink="scroll" routerLinkActive="active">Scroll</a>
      <a routerLink="remote" routerLinkActive="active">Remote</a>
      <a routerLink="state-machine-input" routerLinkActive="active">SM Input</a>
      <a routerLink="list-binding" routerLinkActive="active">List</a>
      <a routerLink="image-binding" routerLinkActive="active">Image</a>
    </nav>
    <main>
      <router-outlet />
    </main>
  `,
})
export class AppComponent {}
