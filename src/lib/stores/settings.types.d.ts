// Type definitions for the app's persistent settings object.
// Referenced via JSDoc in settings.js: @type {import('./settings.types').Settings}
// Having a real .d.ts file makes the references resolve in editors and type checkers.

/** A manually-set time that ticks forward from when it was applied. */
export interface TimeOverride {
  hour: number;
  minute: number;
  /** Unix timestamp (ms) of the moment the override was set.
   *  Used to compute elapsed minutes so the display ticks forward. */
  setAt?: number;
}

/** A manually-set date that advances from when it was applied. */
export interface DateOverride {
  day: number;
  month: number;
  year: number;
  /** Unix timestamp (ms) of the moment the override was set.
   *  Used to compute elapsed days when time is in auto mode. */
  setAt?: number;
}

/** Full settings object — persisted to localStorage and read on every page load. */
export interface Settings {
  dateMode: 'auto' | 'manual';
  dateOverride: DateOverride | null;
  timeMode: 'auto' | 'manual';
  timeOverride: TimeOverride | null;
  /** How often (in minutes) to fetch a new quote. */
  updateInterval: 1 | 5 | 10 | 15;
  /** Whether to show the exact clock time below the date. */
  displayExactTime: boolean;
  /** When true, only quotes with sfw === "yes" are eligible. */
  sfwOnly: boolean;
  /** When true, apply the dark inverted palette for the active theme. */
  invert: boolean;
  /** When true, quotes come from test.json regardless of current time. */
  testMode: boolean;
  theme: 'paper' | 'quiet' | 'focus' | 'bold';
}
