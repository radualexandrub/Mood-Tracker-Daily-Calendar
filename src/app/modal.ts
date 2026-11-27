// src/app/modal.ts: Reusable modal frame (header, scrolling body, action buttons)
import { DialogConfig } from '@angular/cdk/dialog';
import { Component, input, output } from '@angular/core';

/**
 * Builds the shared Modal CDK options for app dialogs, including accessibility, focus, and sizing.
 * The same options can be used by the day editor or future dialogs such as import.
 * The reference result type stays broad so callers can reuse the config for different dialogs.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function modalConfig<D>(data: D): DialogConfig<D, any> {
  return {
    data,
    ariaLabelledBy: 'modal-heading',
    autoFocus: 'dialog',
    width: '34rem',
    maxWidth: 'calc(100vw - 2rem)',
  };
}

/**
 * The frame of a dialog. Put the dialog's content inside it, and mark the buttons that belong in
 * the footer with the `modal-actions` attribute:
 *
 *   <app-modal heading="Import data" (closed)="cancel()">
 *     ...content...
 *     <button modal-actions type="button">Import</button>
 *   </app-modal>
 */
@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal {
  /** Accessible title displayed in the dialog header. */
  readonly heading = input.required<string>();
  /** Emitted when the X in the header is pressed. */
  readonly closed = output<void>();
}
