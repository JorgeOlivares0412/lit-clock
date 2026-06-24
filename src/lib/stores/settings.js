// Svelte writable store for user settings, persisted to localStorage.
// Provides subscribe, update (merges partial values + saves), and reset.
// Loaded once on import; safe to call on the server (localStorage guard).

import { writable } from 'svelte/store';
import { STORAGE_KEY } from '../constants.js';

/** @type {import('./settings.types').Settings} */
const defaults = {
	dateMode: 'auto',
	dateOverride: null,       // { day, month, year, setAt? }

	timeMode: 'auto',
	timeOverride: null,       // { hour, minute, setAt? }

	updateInterval: 1,        // 1 | 5 | 10 | 15 (minutes)
	displayExactTime: true,
	sfwOnly: false,
	invert: false,
	testMode: false,
	theme: 'paper'            // 'paper' | 'quiet' | 'focus' | 'bold'
};

/**
 * Reads persisted settings from localStorage, merging over defaults so that
 * any new keys added in future versions still get their default values.
 * Guards against SSR (no localStorage) and corrupt JSON.
 * @returns {import('./settings.types').Settings}
 */
function loadSettings() {
	if (typeof localStorage === 'undefined') return defaults;
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
	} catch {
		return defaults;
	}
}

/**
 * Creates the settings store with custom update/reset methods that also
 * write through to localStorage so settings survive page reloads.
 */
function createSettings() {
	const { subscribe, set, update } = writable(loadSettings());

	return {
		subscribe,
		/**
		 * Shallow-merge newValues into the current settings and persist.
		 * @param {Partial<import('./settings.types').Settings>} newValues
		 */
		update(newValues) {
			update(current => {
				const next = { ...current, ...newValues };
				if (typeof localStorage !== 'undefined') {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
				}
				return next;
			});
		},
		/** Resets all settings to their defaults and clears localStorage. */
		reset() {
			set(defaults);
			if (typeof localStorage !== 'undefined') {
				localStorage.removeItem(STORAGE_KEY);
			}
		}
	};
}

export const settings = createSettings();
