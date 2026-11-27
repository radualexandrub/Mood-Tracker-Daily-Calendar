# Mood Tracker & Daily Calendar

A static Angular app that shows a continuous year calendar where you log, for every day, your mood, up to 3 themes and up to 3 short tasks. Click a day, fill in a dialog, and the calendar cell shows a mood-colored background, a faint emoticon, the themes and the tasks.

There is no backend and no server-side dependency. The build output is plain HTML, CSS and JS, therefore it runs on any static host. The data is stored in browser's `localStorage` and never sent anywhere.

Built with Angular 20 and Angular CDK (dialog). Node.js version 24.

<br/>

## Features

- **Mood per day**: Angry (red), Sad (orange), Neutral (yellow) or Happy (green). The cell gets a soft tint of that color and a low-opacity emoticon (eyes, eyebrows, mouth) behind the day number.
- **Up to 3 themes per day**: chosen from a predefined list (Work, Clean, Outside, Shopping, ...) and shown in the cell separated by commas.
- **Up to 3 tasks per day**: free text of at most 64 characters, one line per task in the cell. Each task has a text color: default, green or red.
- **Edit in a dialog**: clicking a day (or pressing Enter / Space on it) opens a dialog. Save stores the day; Cancel, Escape and X close it without changes. Saving a day with nothing selected removes it.
- **Clear a day**: the small X in a calendar cell deletes the mood, themes and tasks of that day.
- **Continuous year calendar**: one scrollable grid of Monday-to-Sunday weeks, with no gaps in the day numbering when a month ends. Months alternate between two slightly different backgrounds, the first and last day of each month carry a small label, and the weekday header stays pinned while you scroll.
- **Month banners**: each month starts with a banner showing how many days are logged and how many days had each mood.
- **Year navigation**: previous / next year buttons. The app remembers your last selected year.
- **Dark theme and accent color**: toggles in the footer.
- **Responsive**: works on desktop and mobile.

<br/>

## Running the app

Requires Node.js 24 (any version from 20.19 works). Install the dependencies once:

```bash
npm install
```

Run Development:

```bash
npm start
```

Build:

```bash
npm run build
```

The production build is written to `dist/mood-tracker-calendar/browser`. It uses a relative base path (`<base href="./">`), so it can be served from the root of a domain or from a URL sub-path (e.g. `<site>.com/<app>`).

<br/>

## How data is stored

Everything is kept in one `localStorage` key, `mood-tracker-entries`, as JSON keyed by date. Days with no data are not stored.

```json
{
  "2026-03-14": {
    "mood": "happy",
    "themes": ["Work", "Cook"],
    "tasks": [
      { "text": "Cooked dinner", "color": "green" },
      { "text": "Didn't go outside", "color": "red" }
    ]
  }
}
```

Everything that enters the store goes through `normalizeEntry()` in `src/app/tracker.ts`, which drops unknown moods and colors, trims and shortens text, and caps the lists. A future import can reuse it, and the `Modal` component, for its own dialog.

<br/>

## App customization at development level

- **Theme colour**: change `--hue-primary` in `src/styles.css`.
- **Mood colors and tint**: change `--mood-angry`, `--mood-sad`, `--mood-neutral`, `--mood-happy`, `--mood-tint` (cell background strength) and `--mood-face-opacity` in `src/styles.css`. The dark theme has its own values.
- **Task text colors**: change `--task-green` and `--task-red` in `src/styles.css`.
- **Themes list**: edit `THEMES` in `src/app/tracker.ts`. Themes already saved on a day stay visible even if you remove them from the list.
- **Limits**: `MAX_TASKS`, `MAX_THEMES`, `TASK_MAX_LENGTH` in `src/app/tracker.ts`. Note that the calendar styles are tuned for 3 tasks.
- **Emoticons**: the eyebrow and mouth paths are in `FACES` in `src/app/mood-face.ts`.

<br/>

## License

Copyright (c) 2026 Radu-Alexandru Bulai

Released under MIT License