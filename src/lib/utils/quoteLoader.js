// Loads quote entries from the flat JSON files under static/data/quotes/.
// Handles time-window pooling, the SFW filter, test mode, and sanitization.
// The base path import ensures fetch URLs work correctly on GitHub Pages.

import { base } from '$app/paths';
import { toFileKey } from './timeUtils.js';
import { TOLERANCE_BY_INTERVAL } from '../constants.js';

/**
 * Builds the array of { hour, minute } objects covering the time window.
 * For exact mode (interval=1), returns just the current minute.
 * For wider intervals, returns current ± tolerance minutes so there's a
 * bigger pool to pick from — e.g. at 5m interval, ±2 minutes = 5 files.
 *
 * Times wrap around midnight correctly via the modulo arithmetic.
 *
 * @param {{ hour: number, minute: number }} time
 * @param {number} intervalMinutes
 * @returns {{ hour: number, minute: number }[]}
 */
function buildTimeWindow(time, intervalMinutes) {
	// tolerance = 0 for 1m (exact match only); grows with interval
	const tolerance = TOLERANCE_BY_INTERVAL[intervalMinutes] ?? 0;

	const times = [];
	for (let offset = -tolerance; offset <= tolerance; offset++) {
		let totalMinutes = time.hour * 60 + time.minute + offset;
		// Wrap around midnight in both directions
		totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;
		times.push({ hour: Math.floor(totalMinutes / 60), minute: totalMinutes % 60 });
	}
	return times;
}

/**
 * Fetches a single quote file and returns its entries, or [] on failure.
 * Failures are silently ignored so a missing file doesn't break the whole load.
 *
 * @param {{ hour: number, minute: number }} time
 * @returns {Promise<object[]>}
 */
async function fetchQuoteFile(time) {
	const key = toFileKey(time);
	try {
		const res = await fetch(`${base}/data/quotes/${key}.json`);
		if (!res.ok) return [];
		return await res.json();
	} catch {
		return [];
	}
}

/**
 * Sanitizes a raw quote text string from the dataset.
 *
 * The dataset contains HTML entities, inline tags, and some Unicode
 * mathematical-alphanumeric glyphs. We normalise all of these at runtime
 * (rather than during a dataset migration) so the raw files stay untouched.
 *
 * Steps:
 *  1. Decode HTML entities via a temporary <textarea> element.
 *     This handles &amp; &lt; &rsquo; &#39; and all other named/numeric
 *     entities without executing scripts — safe for untrusted content.
 *  2. Replace <br> / <br/> / <br /> with a real newline character.
 *     white-space: pre-line in CSS then renders it as a visible line break.
 *  3. Strip any remaining HTML tags (e.g. <p>, <em>).
 *  4. Convert Unicode mathematical-alphanumeric symbols (U+1D400–U+1D7FF)
 *     to their plain ASCII equivalents. A handful of quotes in the dataset
 *     use bold/italic mathematical variants of letters that look "wrong" in
 *     the chosen body fonts — mapping them to regular ASCII fixes this.
 *     The block has 52-char alphabets (26 upper + 26 lower); offset % 52
 *     gives the position within whichever alphabet variant is in use.
 *  5. Collapse runs of spaces/tabs (but NOT newlines) to a single space,
 *     and cap consecutive newlines at two.
 *
 * @param {string} str
 * @returns {string}
 */
function sanitizeText(str) {
	if (!str) return '';

	// Step 1: decode HTML entities
	if (typeof document !== 'undefined') {
		const el = document.createElement('textarea');
		el.innerHTML = str;
		str = el.value;
	}

	// Step 2 & 3: <br> → newline, then strip remaining tags
	let result = str
		.replace(/<br\s*\/?>/gi, '\n')  // <br/> → real newline (preserved via pre-line)
		.replace(/<[^>]+>/g, '');       // strip any remaining HTML tags

	// Step 4: convert mathematical alphanumeric symbols to plain ASCII
	// Each "variant alphabet" in the block is 52 code points (A–Z then a–z).
	// We compute position within the 52-char cycle and map back to ASCII.
	result = Array.from(result)
		.map(char => {
			const codePoint = char.codePointAt(0);
			// Mathematical Alphanumeric Symbols block: U+1D400–U+1D7FF
			if (codePoint >= 0x1D400 && codePoint <= 0x1D7FF) {
				const offset = codePoint - 0x1D400;
				const position = offset % 52;
				if (position < 26) {
					// Uppercase A–Z
					return String.fromCharCode(65 + position);
				} else {
					// Lowercase a–z
					return String.fromCharCode(97 + (position - 26));
				}
			}
			return char;
		})
		.join('');

	// Step 5: normalise whitespace
	return result
		.replace(/[^\S\n]+/g, ' ')   // collapse spaces/tabs, preserve newlines
		.replace(/\n{3,}/g, '\n\n'); // cap at two consecutive line breaks
}

/**
 * Sanitizes the text fields of a raw quote entry.
 * Only the three display text fields are processed; other fields (time,
 * title, author, sfw) are returned as-is.
 *
 * @param {object} quote
 * @returns {object}
 */
function sanitizeQuote(quote) {
	return {
		...quote,
		quote_first:     sanitizeText(quote.quote_first),
		quote_time_case: sanitizeText(quote.quote_time_case),
		quote_last:      sanitizeText(quote.quote_last),
	};
}

/**
 * Loads a quote for the given time and settings.
 * Returns a sanitized quote object, or null if no eligible quotes exist.
 *
 * In test mode, bypasses the time-window logic entirely and loads from
 * the single test.json fixture file — useful for visual debugging without
 * having to wait for a specific minute.
 *
 * @param {{ hour: number, minute: number }} time
 * @param {{ updateInterval: number, sfwOnly: boolean, testMode: boolean }} settings
 * @returns {Promise<object|null>}
 */
export async function loadQuote(time, settings) {
	let allEntries;

	if (settings.testMode) {
		// Test mode: load the fixture file regardless of current time
		try {
			const res = await fetch(`${base}/data/quotes/test.json`);
			allEntries = res.ok ? await res.json() : [];
		} catch {
			allEntries = [];
		}
	} else {
		// Normal mode: pool all files in the tolerance window, then flatten
		const window = buildTimeWindow(time, settings.updateInterval);
		allEntries = (await Promise.all(window.map(fetchQuoteFile))).flat();
	}

	// Apply SFW filter — when sfwOnly is on, exclude entries marked sfw:"no"
	const pool = settings.sfwOnly
		? allEntries.filter(q => q.sfw === 'yes')
		: allEntries;

	if (pool.length === 0) return null;

	// Random pick, then sanitize before handing to the UI
	const raw = pool[Math.floor(Math.random() * pool.length)];
	return sanitizeQuote(raw);
}
