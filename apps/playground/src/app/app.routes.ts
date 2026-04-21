import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'simple',
    loadComponent: () =>
      import('./examples/simple.component').then((m) => m.SimpleComponent),
  },
  {
    path: 'data-binding',
    loadComponent: () =>
      import('./examples/data-binding.component').then((m) => m.DataBindingComponent),
  },
  {
    path: 'events',
    loadComponent: () =>
      import('./examples/events.component').then((m) => m.EventsComponent),
  },
  {
    path: 'responsive-layout',
    loadComponent: () =>
      import('./examples/responsive-layout.component').then((m) => m.ResponsiveLayoutComponent),
  },
  {
    path: 'error-recovery',
    loadComponent: () =>
      import('./examples/error-recovery.component').then((m) => m.ErrorRecoveryComponent),
  },
  {
    path: 'scroll',
    loadComponent: () => import('./examples/scroll.component').then((m) => m.ScrollComponent),
  },
  {
    path: 'remote',
    loadComponent: () => import('./examples/remote.component').then((m) => m.RemoteComponent),
  },
  {
    path: 'state-machine-input',
    loadComponent: () =>
      import('./examples/state-machine-input.component').then((m) => m.StateMachineInputComponent),
  },
  {
    path: 'list-binding',
    loadComponent: () =>
      import('./examples/list-binding.component').then((m) => m.ListBindingComponent),
  },
  {
    path: 'image-binding',
    loadComponent: () =>
      import('./examples/image-binding.component').then((m) => m.ImageBindingComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'simple' },
];
