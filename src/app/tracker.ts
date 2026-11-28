// src/app/tracker.ts: Shared types, limits and predefined choices for the mood & tasks tracker
/** A mood value that can be stored for the day. */
export type Mood = 'angry' | 'sad' | 'neutral' | 'happy';

/** Available moods and their display labels. */
export const MOODS: { id: Mood; label: string }[] = [
  { id: 'angry', label: 'Angry' },
  { id: 'sad', label: 'Sad' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'happy', label: 'Happy' },
];

/** The supported customizable "task"'s text colors. */
export type TaskColor = 'default' | 'green' | 'red';

/** A single non-empty task saved as part of a day entry. */
export interface Task {
  text: string;
  color: TaskColor;
}

/** Everything stored for one day. An entry with no mood, no themes and no tasks is never stored. */
export interface DayEntry {
  mood: Mood | null;
  themes: string[];
  tasks: Task[];
}

/** Available task colors and their display labels. */
export const TASK_COLORS: { id: TaskColor; label: string }[] = [
  { id: 'default', label: 'Default' },
  { id: 'green', label: 'Green' },
  { id: 'red', label: 'Red' },
];

/** Predefined day themes. Edit this list to change the choices shown in the day dialog. */
export const THEMES: string[] = [
  'Work', 'Clean', 'Outside', 'Shopping', 'Groceries',
  'Productive', 'Movies', 'Games', 'Cook', 'Bake',
];

/** Maximum number of themes and tasks allowed on one day. */
export const MAX_TASKS = 3;
export const MAX_THEMES = 3;

/** Maximum stored character lengths for task and theme text. */
export const TASK_MAX_LENGTH = 64;
export const THEME_MAX_LENGTH = 32;

/** Inclusive bounds for year navigation and the restored selected year. */
export const MIN_YEAR = 2000;
export const MAX_YEAR = 2100;

const isMood = (value: unknown): value is Mood => MOODS.some(m => m.id === value);
const isTaskColor = (value: unknown): value is TaskColor => TASK_COLORS.some(c => c.id === value);

/**
 * The validation and cleanup boundary for values entering the day store.
 * Unknown moods become null, unknown task colors become `default`, and text is trimmed,
 * length-limited, and capped by the per-day item limits. Returns null when the day is empty.
 * Used for dialog results, deletes, and data loaded from localStorage.
 */
export function normalizeEntry(value: unknown): DayEntry | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as { mood?: unknown; themes?: unknown; tasks?: unknown };

  const mood = isMood(raw.mood) ? raw.mood : null;

  const themes = Array.isArray(raw.themes)
    ? [...new Set(raw.themes
        .filter((t): t is string => typeof t === 'string')
        .map(t => t.trim().slice(0, THEME_MAX_LENGTH))
        .filter(Boolean))].slice(0, MAX_THEMES)
    : [];

  const tasks: Task[] = [];
  for (const item of Array.isArray(raw.tasks) ? raw.tasks : []) {
    const text = typeof item?.text === 'string' ? item.text.trim().slice(0, TASK_MAX_LENGTH) : '';
    if (text) tasks.push({ text, color: isTaskColor(item.color) ? item.color : 'default' });
    if (tasks.length === MAX_TASKS) break;
  }

  return mood || themes.length || tasks.length ? { mood, themes, tasks } : null;
}

// ---------- Import / export ----------
export const EXPORT_APP_ID = 'mood-tracker-calendar';
export const EXPORT_VERSION = 1;
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

export type ImportMode = 'add' | 'overwrite';

/** The valid days of one calendar year found in an import file. */
export interface ImportedYear {
  year: number;
  days: Record<string, DayEntry>;
}

export interface ParsedImport {
  years: ImportedYear[];
  valid: number;
  skipped: number;
}

export interface ImportSummary {
  entries: Record<string, DayEntry>;
  added: number;
  replaced: number;
  removed: number;
  unchanged: number;
}

/** An import validation error with a message suitable for displaying to the user. */
export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

/** Rejects dates like 2026-02-31 that match the ISO pattern but do not exist. */
function isRealDate(iso: string): boolean {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** Validates a JSON export and groups its valid days by year. */
export function parseImport(text: string): ParsedImport {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('The file is not valid JSON.');
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new ImportError('This is not a file exported by this app.');
  }
  const file = data as { appId?: unknown; version?: unknown; entries?: unknown };
  if (file.appId !== EXPORT_APP_ID) throw new ImportError('This is not a file exported by this app.');
  if (file.version !== EXPORT_VERSION) throw new ImportError('This export version is not supported.');
  if (!file.entries || typeof file.entries !== 'object' || Array.isArray(file.entries)) {
    throw new ImportError('The file has no "entries" section.');
  }

  const byYear = new Map<number, Record<string, DayEntry>>();
  let valid = 0;
  let skipped = 0;
  for (const [iso, value] of Object.entries(file.entries)) {
    const year = Number(iso.slice(0, 4));
    const entry = ISO_DATE.test(iso) && isRealDate(iso) && year >= MIN_YEAR && year <= MAX_YEAR
      ? normalizeEntry(value)
      : null;
    if (!entry) {
      skipped++;
      continue;
    }

    const days = byYear.get(year) ?? {};
    days[iso] = entry;
    byYear.set(year, days);
    valid++;
  }
  if (!valid) throw new ImportError('No valid days found in this file.');

  return {
    years: [...byYear].map(([year, days]) => ({ year, days })).sort((a, b) => a.year - b.year),
    valid,
    skipped,
  };
}

/** Merges imported years into the current store and returns counts for the status message. */
export function mergeEntries(
  current: Record<string, DayEntry>, years: ImportedYear[], mode: ImportMode,
): ImportSummary {
  const entries = { ...current };
  let added = 0;
  let replaced = 0;
  let removed = 0;
  let unchanged = 0;

  if (mode === 'overwrite') {
    const touchedYears = new Set(years.map(year => year.year));
    const importedDates = new Set(years.flatMap(year => Object.keys(year.days)));
    for (const iso of Object.keys(current)) {
      if (touchedYears.has(Number(iso.slice(0, 4))) && !importedDates.has(iso)) {
        delete entries[iso];
        removed++;
      }
    }
  }

  for (const { days } of years) {
    for (const [iso, entry] of Object.entries(days)) {
      if (mode === 'add' && current[iso]) {
        unchanged++;
        continue;
      }
      if (current[iso]) replaced++;
      else added++;
      entries[iso] = entry;
    }
  }

  return { entries, added, replaced, removed, unchanged };
}
