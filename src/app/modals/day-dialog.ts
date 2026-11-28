// src/app/modals/day-dialog.ts: Dialog for editing the mood, themes and tasks of one day
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Modal } from './modal';
import { MoodFace } from '../mood-face';
import {
  DayEntry, MAX_TASKS, MAX_THEMES, MOODS, Mood, TASK_COLORS, TASK_MAX_LENGTH, TaskColor, THEMES,
} from '../tracker';

export interface DayDialogData {
  /** ISO date key of the calendar day being edited */
  iso: string;
  /** Existing saved value, if this day already has data */
  entry?: DayEntry;
}

/** A task being edited. The id keeps the input rows stable when a row above is removed */
interface TaskDraft {
  id: number;
  text: string;
  color: TaskColor;
}

/** Builds & Formats an ISO calendar date as the dialog's long heading title of the modal */
function formatLongDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day)
    .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

@Component({
  selector: 'app-day-dialog',
  imports: [Modal, MoodFace],
  templateUrl: './day-dialog.html',
  styleUrl: './day-dialog.css',
})
export class DayDialog {
  private readonly dialogRef = inject<DialogRef<DayEntry>>(DialogRef);
  private readonly data = inject<DayDialogData>(DIALOG_DATA);
  private nextTaskId = 0;

  readonly moods = MOODS;
  readonly taskColors = TASK_COLORS;
  readonly maxThemes = MAX_THEMES;
  readonly maxTasks = MAX_TASKS;
  readonly taskMaxLength = TASK_MAX_LENGTH;
  readonly heading = formatLongDate(this.data.iso);

  /** Editable mood and theme drafts, initialized from the saved day when present */
  readonly mood = signal<Mood | null>(this.data.entry?.mood ?? null);
  readonly themes = signal<string[]>([...(this.data.entry?.themes ?? [])]);
  /** The predefined themes, plus any saved theme that is no longer in the list, so it can still be removed */
  readonly themeOptions = [...THEMES, ...(this.data.entry?.themes ?? []).filter(t => !THEMES.includes(t))];

  readonly tasks = signal<TaskDraft[]>(this.initialTasks());
  readonly canAddTask = computed(() => this.tasks().length < MAX_TASKS);

  constructor() {
    this.dialogRef.disableClose = true;
    this.dialogRef.backdropClick
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.save());
    this.dialogRef.keydownEvents
      .pipe(takeUntilDestroyed())
      .subscribe(event => {
        if (event.key === 'Escape' && !event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          this.cancel();
        }
      });
  }

  /** Converts/Maps saved tasks into stable input editor rows, or creates the initial blank row */
  private initialTasks(): TaskDraft[] {
    const saved = this.data.entry?.tasks ?? [];
    // Always start with at least one empty row, so the first task needs no extra click
    return (saved.length ? saved : [{ text: '', color: 'default' as TaskColor }])
      .map(task => ({ id: this.nextTaskId++, ...task }));
  }

  /** Sets a mood for that day.
   * Clicking the selected mood again clears it */
  toggleMood(mood: Mood): void {
    this.mood.update(current => current === mood ? null : mood);
  }

  /** Adds a theme within the per-day limit, or removes it when already selected */
  toggleTheme(theme: string): void {
    this.themes.update(current => {
      if (current.includes(theme)) return current.filter(t => t !== theme);
      return current.length < MAX_THEMES ? [...current, theme] : current;
    });
  }

  /** Once 3 themes are chosen, the rest are disabled until one is unselected */
  isThemeDisabled(theme: string): boolean {
    return !this.themes().includes(theme) && this.themes().length >= MAX_THEMES;
  }

  /** Appends a blank task row when the per-day limit has not been reached */
  addTask(): void {
    if (!this.canAddTask()) return;
    this.tasks.update(current => [...current, { id: this.nextTaskId++, text: '', color: 'default' }]);
  }

  /** Removes the matching draft row without disturbing the identities of remaining rows */
  removeTask(id: number): void {
    this.tasks.update(current => current.filter(t => t.id !== id));
  }

  /** Replaces the text draft for one task row without mutating other rows */
  setTaskText(id: number, text: string): void {
    this.tasks.update(current => current.map(t => t.id === id ? { ...t, text } : t));
  }

  /** Replaces the color draft for one task row without mutating other rows */
  setTaskColor(id: number, color: TaskColor): void {
    this.tasks.update(current => current.map(t => t.id === id ? { ...t, color } : t));
  }

  /**
   * DayDialog.save() Closes with the edited value. 
   * The app validates it before storing; blank task rows are omitted/dropped.
   * The template also calls this when Enter is pressed in a task input
   */
  save(): void {
    this.dialogRef.close({
      mood: this.mood(),
      themes: this.themes(),
      tasks: this.tasks()
        .map(t => {
          // Capitalize the first letter of each task, and trim
          const [first, ...rest] = t.text.trim();
          return { text: first ? first.toUpperCase() + rest.join('') : '', color: t.color };
        })
        .filter(t => t.text),
    });
  }

  /** Closes without a value, leaving the saved day unchanged */
  cancel(): void {
    this.dialogRef.close();
  }
}
