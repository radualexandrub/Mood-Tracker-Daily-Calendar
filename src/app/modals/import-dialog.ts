// src/app/modals/import-dialog.ts: Dialog for importing JSON exported by this app
import { DialogRef } from '@angular/cdk/dialog';
import { Component, inject, signal } from '@angular/core';
import { Modal } from './modal';
import { ImportError, ImportMode, MAX_IMPORT_BYTES, ParsedImport, parseImport } from '../tracker';

/** Returned by Import only; Cancel, X and Escape close without a value. */
export interface ImportDialogResult extends ParsedImport {
  mode: ImportMode;
}

@Component({
  selector: 'app-import-dialog',
  imports: [Modal],
  templateUrl: './import-dialog.html',
  styleUrl: './import-dialog.css',
})
export class ImportDialog {
  private readonly dialogRef = inject<DialogRef<ImportDialogResult>>(DialogRef);

  readonly importMode = signal<ImportMode>('add');
  readonly parsed = signal<ParsedImport | null>(null);
  readonly fileName = signal('');
  readonly error = signal('');

  setMode(mode: ImportMode): void {
    this.importMode.set(mode);
  }

  /** Reads and validates the selected file before the user submits the import. */
  async onFileChange(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.parsed.set(null);
    this.error.set('');
    this.fileName.set(file?.name ?? '');
    if (!file) return;

    try {
      if (file.size > MAX_IMPORT_BYTES) {
        throw new ImportError(`The file is too large (maximum ${MAX_IMPORT_BYTES / 1024 / 1024} MB).`);
      }
      this.parsed.set(parseImport(await file.text()));
    } catch (error) {
      this.error.set(error instanceof ImportError ? error.message : 'The file could not be read.');
    }
  }

  submit(): void {
    const parsed = this.parsed();
    if (!parsed) {
      this.error.set(this.error() || 'Choose a JSON file exported by this app.');
      return;
    }
    this.dialogRef.close({ ...parsed, mode: this.importMode() });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
