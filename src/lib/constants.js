// Central place for tunable constants used across the app.
// Importing from here (rather than inlining magic numbers) makes it easy
// to tweak behaviour in one spot without hunting through multiple files.

// localStorage key under which the settings object is persisted.
export const STORAGE_KEY = 'litclock_settings';

// Update interval (minutes) → +/- tolerance window (minutes) of quote files
// to pool together. 1m = exact match only; wider intervals pull in neighbouring
// minute files so there is always a reasonable pool to pick from.
export const TOLERANCE_BY_INTERVAL = { 1: 0, 5: 2, 10: 5, 15: 7 };

// Available update intervals shown in the Settings panel (minutes).
export const UPDATE_INTERVALS = [1, 5, 10, 15];

// Quote length (total chars) → size tier.
// Used by quoteSize.js to scale the quote + attribution font consistently.
// Tiers map to CSS classes: 'q-s' | 'q-m' | 'q-l' | 'q-xl'
export const SIZE_THRESHOLDS = { s: 150, m: 300, l: 500 };

// Hidden multi-tap gesture: TAP_COUNT taps within TAP_WINDOW_MS triggers the action.
// Used by DateHeader (open settings) and SettingsPanel heading (toggle test mode).
export const TAP_COUNT = 4;
export const TAP_WINDOW_MS = 700;

// Available visual themes (matches data-theme values in paper.css).
export const THEMES = ['paper', 'quiet', 'focus', 'bold'];
