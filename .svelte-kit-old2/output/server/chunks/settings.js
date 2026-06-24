import { k as writable } from "./index-server.js";
import "./index-server2.js";
//#region src/lib/constants.js
var STORAGE_KEY = "litclock_settings";
var TOLERANCE_BY_INTERVAL = {
	1: 0,
	5: 2,
	10: 5,
	15: 7
};
var UPDATE_INTERVALS = [
	1,
	5,
	10,
	15
];
var SIZE_THRESHOLDS = {
	s: 150,
	m: 300,
	l: 500
};
var THEMES = [
	"paper",
	"quiet",
	"focus",
	"bold"
];
//#endregion
//#region src/lib/stores/settings.js
/** @type {import('./settings.types').Settings} */
var defaults = {
	dateMode: "auto",
	dateOverride: null,
	timeMode: "auto",
	timeOverride: null,
	updateInterval: 1,
	displayExactTime: true,
	sfwOnly: false,
	invert: false,
	testMode: false,
	theme: "paper"
};
/**
* Reads persisted settings from localStorage, merging over defaults so that
* any new keys added in future versions still get their default values.
* Guards against SSR (no localStorage) and corrupt JSON.
* @returns {import('./settings.types').Settings}
*/
function loadSettings() {
	if (typeof localStorage === "undefined") return defaults;
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? {
			...defaults,
			...JSON.parse(stored)
		} : defaults;
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
			update((current) => {
				const next = {
					...current,
					...newValues
				};
				if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
				return next;
			});
		},
		/** Resets all settings to their defaults and clears localStorage. */
		reset() {
			set(defaults);
			if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE_KEY);
		}
	};
}
var settings = createSettings();
//#endregion
export { UPDATE_INTERVALS as a, TOLERANCE_BY_INTERVAL as i, SIZE_THRESHOLDS as n, THEMES as r, settings as t };
