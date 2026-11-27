// src/app/app.ts: Main application component
import { Dialog } from '@angular/cdk/dialog';
import { AfterViewInit, Component, ElementRef, HostListener, computed, effect, inject, signal } from '@angular/core';
import { DayDialog, DayDialogData } from './day-dialog';
import { Footer } from './footer';
import { modalConfig } from './modal';
import { MoodFace } from './mood-face';
import { DayEntry, MAX_TASKS, MAX_THEMES, MAX_YEAR, MIN_YEAR, MOODS, Mood, Task, normalizeEntry } from './tracker';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_HEADERS = [
  { long: 'Monday', short: 'Mon' }, { long: 'Tuesday', short: 'Tue' }, { long: 'Wednesday', short: 'Wed' },
  { long: 'Thursday', short: 'Thu' }, { long: 'Friday', short: 'Fri' }, { long: 'Saturday', short: 'Sat' },
  { long: 'Sunday', short: 'Sun' },
];
/** All saved days share one localStorage key, keyed by ISO date: { "2026-03-14": DayEntry, ... } */
const ENTRIES_KEY = 'mood-tracker-entries';
const YEAR_KEY = 'mood-tracker-selected-year';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;
const shortMonth = (m: number) => MONTHS[m].slice(0, 3);

interface Cell {
  iso: string;
  day: number;
  month: number;
  monthShort: string;
  odd: boolean;
  inYear: boolean;
  weekend: boolean;
  mood: Mood | null;
  themes: string[];
  tasks: Task[];
  filled: boolean; // has a mood, themes or tasks
  title: string; // tooltip with the full (untruncated) text of the day
  first: boolean;
  last: boolean;
}
/** A rendered calendar row is either a month banner or one Monday-to-Sunday week */
interface CalRow { key: string; month?: MonthStat; cells?: Cell[]; }
/** Logged-day and mood totals used by a month's banner and summary controls */
interface MonthStat {
  index: number;
  name: string;
  daysInMonth: number;
  logged: number; // days with something saved
  moods: Record<Mood, number>;
}

/**
 * Loads and normalizes saved entries, retaining only values with date-shaped ISO keys.
 * Missing, corrupt, or unavailable storage starts the app with an empty store.
 */
function loadEntries(): Record<string, DayEntry> {
  const entries: Record<string, DayEntry> = {};
  try {
    const saved = JSON.parse(localStorage.getItem(ENTRIES_KEY) ?? 'null');
    if (saved && typeof saved === 'object') {
      for (const [iso, value] of Object.entries(saved)) {
        const entry = normalizeEntry(value);
        if (entry && ISO_DATE.test(iso)) entries[iso] = entry;
      }
    }
  } catch { /* storage unavailable or corrupt: start fresh */ }
  return entries;
}

/** Restore the last selected year, otherwise use the current year */
function initialYearSelected(): number {
  try {
    const saved = Number(localStorage.getItem(YEAR_KEY));
    if (Number.isInteger(saved) && saved >= MIN_YEAR && saved <= MAX_YEAR) return saved;
  } catch { /* ignore */ }
  const current = new Date().getFullYear();
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, current));
}

/** One line with everything saved for a day, used as the cell tooltip */
function describe(entry?: DayEntry): string {
  if (!entry) return 'Click to add mood, themes and tasks';
  const mood = MOODS.find(m => m.id === entry.mood)?.label;
  return [mood, entry.themes.join(', '), entry.tasks.map(t => t.text).join('; ')]
    .filter(Boolean)
    .join(' · ');
}

@Component({
  selector: 'app-root',
  imports: [Footer, MoodFace],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly dialog = inject(Dialog);

  readonly moods = MOODS;
  readonly maxThemes = MAX_THEMES;
  readonly maxTasks = MAX_TASKS;
  readonly weekdayHeaders = WEEKDAY_HEADERS;
  /** Currently displayed year; changing it rebuilds the derived calendar signals */
  readonly year = signal(initialYearSelected());
  readonly canGoBack = computed(() => this.year() > MIN_YEAR);
  readonly canGoForward = computed(() => this.year() < MAX_YEAR);

  /** Single source of truth for all saved days; every write is normalized before updating it */
  private readonly entries = signal<Record<string, DayEntry>>(loadEntries());
  readonly showBackToTop = signal(false);

  /** Logged days and mood counts for all 12 months */
  readonly months = computed<MonthStat[]>(() => {
    const year = this.year();
    const entries = this.entries();
    return MONTHS.map((name, index) => {
      const daysInMonth = new Date(year, index + 1, 0).getDate();
      const moods: Record<Mood, number> = { angry: 0, sad: 0, neutral: 0, happy: 0 };
      let logged = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const entry = entries[toIso(new Date(year, index, day))];
        if (!entry) continue;
        logged++;
        if (entry.mood) moods[entry.mood]++;
      }
      return { index, name, daysInMonth, logged, moods };
    });
  });
  readonly daysInYear = computed(() => this.months().reduce((sum, m) => sum + m.daysInMonth, 0));
  readonly logged = computed(() => this.months().reduce((sum, m) => sum + m.logged, 0));
  readonly percentLogged = computed(() => (this.logged() / this.daysInYear()) * 100);

  /**
   * The whole year as one continuous list of Monday-to-Sunday weeks. A banner row (month name and
   * logged days) precedes the week that contains the 1st of each month. The first and last week
   * are completed with real days from the neighbouring years, so numbering never has gaps.
   */
  readonly rows = computed<CalRow[]>(() => {
    const year = this.year();
    const months = this.months();
    const entries = this.entries();
    const firstOfYear = new Date(year, 0, 1);
    const lastOfYear = new Date(year, 11, 31);
    const before = (firstOfYear.getDay() + 6) % 7; // days back to the previous Monday
    const after = (7 - lastOfYear.getDay()) % 7; // days forward to the next Sunday
    const daysInYear = Math.round((lastOfYear.getTime() - firstOfYear.getTime()) / 86_400_000) + 1;

    const rows: CalRow[] = [];
    let week: Cell[] = [];
    for (let i = 0; i < before + daysInYear + after; i++) {
      const date = new Date(year, 0, 1 - before + i);
      const iso = toIso(date);
      const inYear = date.getFullYear() === year;
      const entry = inYear ? entries[iso] : undefined; // days of other years stay empty and inactive
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      week.push({
        iso,
        day: date.getDate(),
        month: date.getMonth(),
        monthShort: shortMonth(date.getMonth()),
        odd: date.getMonth() % 2 === 1,
        inYear,
        weekend: isWeekend(date),
        mood: entry?.mood ?? null,
        themes: entry?.themes ?? [],
        tasks: entry?.tasks ?? [],
        filled: !!entry,
        title: inYear ? describe(entry) : '',
        first: inYear && date.getDate() === 1,
        last: inYear && date.getDate() === lastDay,
      });
      if (week.length === 7) {
        const monthStart = week.find(c => c.first);
        if (monthStart) rows.push({ key: 'month-' + monthStart.month, month: months[monthStart.month] });
        rows.push({ key: week[0].iso, cells: week });
        week = [];
      }
    }
    return rows;
  });

  constructor() {
    // Persist each signal independently so changing the view year does not rewrite day entries.
    effect(() => {
      try {
        localStorage.setItem(ENTRIES_KEY, JSON.stringify(this.entries()));
      } catch { /* ignore */ }
    });
    effect(() => {
      try {
        localStorage.setItem(YEAR_KEY, String(this.year()));
      } catch { /* ignore */ }
    });
  }

  /** Moves the selected year by the requested amount while respecting the supported bounds */
  changeYear(delta: number): void {
    const year = this.year() + delta;
    if (year >= MIN_YEAR && year <= MAX_YEAR) this.year.set(year);
  }

  /** Clicking a day of the selected year opens the dialog where its mood, themes and tasks are edited */
  openDay(cell: Cell): void {
    if (!cell.inYear) return;
    const ref = this.dialog.open<DayEntry, DayDialogData>(
      DayDialog,
      modalConfig<DayDialogData>({ iso: cell.iso, entry: this.entries()[cell.iso] }));
    // The dialog only returns a value when Save is pressed. Cancel, Escape and X return nothing.
    ref.closed.subscribe(result => {
      if (result) this.saveDay(cell.iso, result);
    });
  }

  /** Keyboard access: Enter or Space on a focused day opens it, but not on the delete button inside it */
  onCellKey(cell: Cell, event: Event): void {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    this.openDay(cell);
  }

  /** Stores the day, or deletes it when nothing is left (no mood, no themes, no tasks) */
  private saveDay(iso: string, value: DayEntry | null): void {
    const entry = normalizeEntry(value);
    this.entries.update(all => {
      const next = { ...all };
      if (entry) next[iso] = entry;
      else delete next[iso];
      return next;
    });
  }

  /** Deletes mood, themes and tasks of a day (the X in the calendar cell) */
  remove(iso: string): void {
    this.saveDay(iso, null);
  }

  /** Scrolls so the month banner sits right under the sticky top bar and weekday header */
  goTo(index: number): void {
    const el = document.getElementById('month-' + index);
    if (!el) return;
    const bar = this.host.nativeElement.querySelector<HTMLElement>('.top-bar')?.offsetHeight ?? 0;
    const head = this.host.nativeElement.querySelector<HTMLElement>('.cal thead')?.offsetHeight ?? 0;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - bar - head, behavior: 'smooth' });
  }

  /**
   * Show back to top arrow.
   * It appears when user is within 1600px from the bottom
   * and scrolls smoothly to the top when clicked
   */
  @HostListener('window:scroll')
  updateBackToTopVisibility(): void {
    const distanceToBottom = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
    this.showBackToTop.set(
      window.scrollY > 0
      && distanceToBottom <= 1600);
  }

  backToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Keeps the sticky weekday header just below the sticky top bar, whatever height it has */
  ngAfterViewInit(): void {
    const bar = this.host.nativeElement.querySelector<HTMLElement>('.top-bar');
    if (!bar || typeof ResizeObserver === 'undefined') return;
    new ResizeObserver(() => this.host.nativeElement.style.setProperty('--bar-h', bar.offsetHeight + 'px')).observe(bar);
  }
}
