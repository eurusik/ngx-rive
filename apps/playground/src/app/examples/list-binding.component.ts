import { ChangeDetectionStrategy, Component, computed, viewChild } from '@angular/core';
import type { ViewModel, ViewModelInstance } from 'ngx-rive';
import { NgxRiveDirective } from 'ngx-rive';

/**
 * Demonstrates `binding.list('items')` — add / remove / swap instances of a
 * nested view model (`TodoItem`) attached to the `TodoList` parent. The Rive
 * canvas in this file only lays out two visual slots, so we also render the
 * full list in HTML below so the true state is visible.
 */
@Component({
  selector: 'app-list-binding',
  standalone: true,
  imports: [NgxRiveDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host { display: block; }
      .stage { width: 400px; height: 400px; }
      canvas { display: block; width: 100%; height: 100%; }
      .controls { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem; }
      button { font: inherit; padding: 0.25rem 0.75rem; }
      [data-testid='length'] { font-family: monospace; margin-top: 0.75rem; }
      .hint { opacity: 0.7; font-size: 0.9rem; margin-top: 0.25rem; }
      .items { margin-top: 1rem; padding-left: 1.25rem; font-family: monospace; }
      .items li { padding: 0.15rem 0; }
    `,
  ],
  template: `
    <h2>List binding</h2>
    <p>
      Drive a view-model list (<code>TodoList.items</code>) — add, insert, remove, and swap
      <code>TodoItem</code> instances with typed signals.
    </p>
    <div class="stage">
      <canvas
        ngxRive
        src="/assets/db_list_test.riv"
        artboard="Artboard"
        stateMachines="State Machine 1"
        [autoplay]="true"
        [autoBind]="false"
        aria-label="List binding demo"
      ></canvas>
    </div>
    <div class="controls">
      <button data-testid="add" (click)="add()">Add</button>
      <button data-testid="add-at-1" (click)="addAt(1)">Insert at 1</button>
      <button data-testid="remove-first" (click)="removeFirst()">Remove first</button>
      <button data-testid="remove-first-idx" (click)="removeFirstByIndex()">
        Remove first (by index)
      </button>
      <button data-testid="swap" (click)="swapFirstTwo()">Swap 0 ↔ 1</button>
    </div>
    <p data-testid="length">Items: {{ list().length() }}</p>
    <p class="hint">
      The Rive artboard only lays out the first 2 slots visually ("Item A", "Item B"). The list
      underneath shows the true state of <code>TodoList.items</code>:
    </p>
    <ol class="items" data-testid="items-html">
      @for (item of items(); track $index) {
        <li>[{{ $index }}] {{ item }}</li>
      }
    </ol>
  `,
})
export class ListBindingComponent {
  private readonly riveDir = viewChild.required(NgxRiveDirective);

  private readonly binding = computed(() =>
    this.riveDir().bind({ viewModel: 'TodoList', autoBind: true })
  );

  protected readonly list = computed(() => this.binding().list('items'));

  /** Derived array of item summaries — re-computes on every list mutation via `version`. */
  protected readonly items = computed<string[]>(() => {
    this.list().version();
    const length = this.list().length();
    const result: string[] = [];
    for (let i = 0; i < length; i++) {
      const instance = this.list().getInstanceAt(i);
      result.push(this.describeItem(instance, i));
    }
    return result;
  });

  private get todoItemVm(): ViewModel | null {
    const rive = this.riveDir().rive();
    return rive?.viewModelByName('TodoItem') ?? null;
  }

  /** Create a fresh `TodoItem` with a human-readable label pre-filled. */
  private createItem(label: string): ViewModelInstance | null {
    const instance = this.todoItemVm?.instance?.();
    if (!instance) return null;
    const textProp = instance.string?.('text');
    if (textProp) textProp.value = label;
    return instance;
  }

  add(): void {
    const item = this.createItem(`Item ${this.list().length() + 1}`);
    if (item) this.list().addInstance(item);
  }

  addAt(index: number): void {
    const item = this.createItem(`Inserted at ${index}`);
    if (item) this.list().addInstanceAt(item, index);
  }

  removeFirst(): void {
    const first = this.list().getInstanceAt(0);
    if (first) this.list().removeInstance(first);
  }

  removeFirstByIndex(): void {
    if (this.list().length() > 0) this.list().removeInstanceAt(0);
  }

  swapFirstTwo(): void {
    if (this.list().length() >= 2) this.list().swap(0, 1);
  }

  /** Read item's own `text` / `completed` properties to surface it in HTML. */
  private describeItem(instance: ViewModelInstance | null, index: number): string {
    if (!instance) return `#${index} (missing)`;
    const rawText = instance.string?.('text')?.value;
    const text = rawText && rawText.length > 0 ? rawText : '(empty)';
    const completed = instance.boolean?.('completed')?.value;
    return completed == null ? text : `${text} ${completed ? '[done]' : '[ ]'}`;
  }
}
