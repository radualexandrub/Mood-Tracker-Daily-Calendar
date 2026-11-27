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
export const MAX_YEAR = 2080;

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
