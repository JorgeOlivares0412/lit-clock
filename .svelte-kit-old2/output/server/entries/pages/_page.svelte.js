import { H as escape_html, V as attr, a as attr_class, d as unsubscribe_stores, l as store_get, n as onDestroy, o as derived, s as ensure_array_like, u as stringify } from "../../chunks/index-server.js";
import { u as base } from "../../chunks/environment.js";
import { a as UPDATE_INTERVALS, i as TOLERANCE_BY_INTERVAL, n as SIZE_THRESHOLDS, r as THEMES, t as settings } from "../../chunks/settings.js";
import "../../chunks/paths.js";
//#region src/lib/utils/timeUtils.js
/**
* Returns { hour, minute } for the current effective time.
* In auto mode this is the system clock.
* In manual mode, if setAt is present the time "ticks forward" from when it
* was set — so 2:30 set 15 minutes ago displays as 2:45. This gives the feel
* of a live clock anchored to the user's chosen starting point.
* Legacy overrides without setAt are frozen (no ticking).
*
* @param {import('../stores/settings.types').Settings} settings
* @returns {{ hour: number, minute: number }}
*/
function getCurrentTime(settings) {
	if (settings.timeMode === "manual" && settings.timeOverride) {
		const { hour, minute, setAt } = settings.timeOverride;
		if (setAt) {
			const elapsedMinutes = Math.floor((Date.now() - setAt) / 6e4);
			const total = ((hour * 60 + minute + elapsedMinutes) % 1440 + 1440) % 1440;
			return {
				hour: Math.floor(total / 60),
				minute: total % 60
			};
		}
		return {
			hour,
			minute
		};
	}
	const now = /* @__PURE__ */ new Date();
	return {
		hour: now.getHours(),
		minute: now.getMinutes()
	};
}
/**
* Returns { day, month, year } for the current effective date.
*
* Coupling rule: when BOTH date AND time are manually set, the date advances
* by the same number of whole days that the ticking time has crossed since
* setAt. This means if you set 23:50 manually, the date increments naturally
* when the clock ticks past midnight — matching real-world behaviour.
*
* When only the date is manual (time is auto), we advance by elapsed calendar
* days from the dateOverride.setAt timestamp instead.
*
* @param {import('../stores/settings.types').Settings} settings
* @returns {{ day: number, month: number, year: number }}
*/
function getCurrentDate(settings) {
	if (settings.dateMode === "manual" && settings.dateOverride) {
		const { day, month, year } = settings.dateOverride;
		if (settings.timeMode === "manual" && settings.timeOverride?.setAt) {
			const { hour, minute, setAt } = settings.timeOverride;
			const elapsedMinutes = Math.floor((Date.now() - setAt) / 6e4);
			const dayOffset = Math.floor((hour * 60 + minute + elapsedMinutes) / 1440);
			const d = new Date(year, month - 1, day + dayOffset);
			return {
				day: d.getDate(),
				month: d.getMonth() + 1,
				year: d.getFullYear()
			};
		}
		if (settings.dateOverride.setAt) {
			const elapsedDays = Math.floor((Date.now() - settings.dateOverride.setAt) / 864e5);
			const d = new Date(year, month - 1, day + elapsedDays);
			return {
				day: d.getDate(),
				month: d.getMonth() + 1,
				year: d.getFullYear()
			};
		}
		return {
			day,
			month,
			year
		};
	}
	const now = /* @__PURE__ */ new Date();
	return {
		day: now.getDate(),
		month: now.getMonth() + 1,
		year: now.getFullYear()
	};
}
/**
* Formats { day, month, year } as "DD Month YYYY" e.g. "16 May 2025"
* @param {{ day: number, month: number, year: number }} date
* @returns {string}
*/
function formatDate({ day, month, year }) {
	return `${day} ${[
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December"
	][month - 1]} ${year}`;
}
/**
* Formats { hour, minute } as 12-hour clock string e.g. "12:56 am"
* @param {{ hour: number, minute: number }} time
* @returns {string}
*/
function formatTime({ hour, minute }) {
	const period = hour >= 12 ? "pm" : "am";
	return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${period}`;
}
/**
* Converts { hour, minute } to a JSON file key: "HH_MM"
* Used by quoteLoader to build the fetch URL for each minute's quote file.
* @param {{ hour: number, minute: number }} time
* @returns {string}
*/
function toFileKey({ hour, minute }) {
	return `${String(hour).padStart(2, "0")}_${String(minute).padStart(2, "0")}`;
}
/**
* Returns milliseconds until the next aligned interval boundary.
* E.g. at 12:03:20 with a 5-minute interval, the next tick is 12:05:00 → ~100s.
* A 500ms buffer is added so we're safely past the boundary before fetching.
*
* @param {number} intervalMinutes
* @returns {number} milliseconds until next tick
*/
function msUntilNextTick(intervalMinutes) {
	const ms = (/* @__PURE__ */ new Date()).getTime();
	const intervalMs = intervalMinutes * 60 * 1e3;
	return Math.ceil(ms / intervalMs) * intervalMs - ms + 500;
}
//#endregion
//#region src/lib/utils/quoteLoader.js
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
	const tolerance = TOLERANCE_BY_INTERVAL[intervalMinutes] ?? 0;
	const times = [];
	for (let offset = -tolerance; offset <= tolerance; offset++) {
		let totalMinutes = time.hour * 60 + time.minute + offset;
		totalMinutes = (totalMinutes % 1440 + 1440) % 1440;
		times.push({
			hour: Math.floor(totalMinutes / 60),
			minute: totalMinutes % 60
		});
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
	if (!str) return "";
	if (typeof document !== "undefined") {
		const el = document.createElement("textarea");
		el.innerHTML = str;
		str = el.value;
	}
	let result = str.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
	result = Array.from(result).map((char) => {
		const codePoint = char.codePointAt(0);
		if (codePoint >= 119808 && codePoint <= 120831) {
			const position = (codePoint - 119808) % 52;
			if (position < 26) return String.fromCharCode(65 + position);
			else return String.fromCharCode(97 + (position - 26));
		}
		return char;
	}).join("");
	return result.replace(/[^\S\n]+/g, " ").replace(/\n{3,}/g, "\n\n");
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
		quote_first: sanitizeText(quote.quote_first),
		quote_time_case: sanitizeText(quote.quote_time_case),
		quote_last: sanitizeText(quote.quote_last)
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
async function loadQuote(time, settings) {
	let allEntries;
	if (settings.testMode) try {
		const res = await fetch(`${base}/data/quotes/test.json`);
		allEntries = res.ok ? await res.json() : [];
	} catch {
		allEntries = [];
	}
	else {
		const window = buildTimeWindow(time, settings.updateInterval);
		allEntries = (await Promise.all(window.map(fetchQuoteFile))).flat();
	}
	const pool = settings.sfwOnly ? allEntries.filter((q) => q.sfw === "yes") : allEntries;
	if (pool.length === 0) return null;
	const raw = pool[Math.floor(Math.random() * pool.length)];
	return sanitizeQuote(raw);
}
//#endregion
//#region src/lib/utils/quoteSize.js
/**
* Total visible character count of a quote (all three text segments combined).
* Used to pick the right font-size tier.
*
* @param {{ quote_first?: string, quote_time_case?: string, quote_last?: string } | null} quote
* @returns {number}
*/
function quoteCharCount(quote) {
	if (!quote) return 0;
	return (quote.quote_first ?? "").length + (quote.quote_time_case ?? "").length + (quote.quote_last ?? "").length;
}
/**
* Maps a quote to its CSS size-tier class.
* The returned string is used directly as a CSS class on the quote wrapper
* and on the attribution row so both scale identically.
*
*   q-s  → short  (< 150 chars)
*   q-m  → medium (150–299 chars)
*   q-l  → long   (300–499 chars)
*   q-xl → very long (≥ 500 chars)
*
* @param {{ quote_first?: string, quote_time_case?: string, quote_last?: string } | null} quote
* @returns {'q-s' | 'q-m' | 'q-l' | 'q-xl'}
*/
function quoteSizeClass(quote) {
	const n = quoteCharCount(quote);
	if (n < SIZE_THRESHOLDS.s) return "q-s";
	if (n < SIZE_THRESHOLDS.m) return "q-m";
	if (n < SIZE_THRESHOLDS.l) return "q-l";
	return "q-xl";
}
//#endregion
//#region src/lib/components/DateHeader.svelte
function DateHeader($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		/**
		* @type {{
		*   formattedDate: string,
		*   formattedTime: string,
		*   displayExactTime: boolean,
		*   onSettingsOpen: () => void
		* }}
		*/
		let { formattedDate, formattedTime, displayExactTime, onSettingsOpen } = $$props;
		$$renderer.push(`<header class="date-header svelte-nfmkiv" role="button" tabindex="0" aria-label="Date and time. Tap four times quickly to open settings."><p class="date svelte-nfmkiv">${escape_html(formattedDate)}</p> `);
		if (displayExactTime) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<p class="clock svelte-nfmkiv">${escape_html(formattedTime)}</p>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></header>`);
	});
}
//#endregion
//#region src/lib/components/QuoteDisplay.svelte
function QuoteDisplay($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		/**
		* @type {{
		*   quote: {
		*     quote_first: string,
		*     quote_time_case: string,
		*     quote_last: string
		*   }
		* }}
		*/
		let { quote } = $$props;
		let sizeClass = derived(() => quoteSizeClass(quote));
		$$renderer.push(`<div class="quote-wrapper svelte-h1ywf6"><blockquote${attr_class(`quote-text ${stringify(sizeClass())}`, "svelte-h1ywf6")}>${escape_html(quote.quote_first)}<strong>${escape_html(quote.quote_time_case)}</strong>${escape_html(quote.quote_last)}</blockquote></div>`);
	});
}
//#endregion
//#region src/lib/components/Attribution.svelte
function Attribution($$renderer, $$props) {
	/** @type {{ title: string, author: string }} */
	let { title, author } = $$props;
	$$renderer.push(`<div class="attribution svelte-j5ntyh"><p class="title svelte-j5ntyh">${escape_html(title)}</p> <p class="author svelte-j5ntyh">${escape_html(author)}</p></div>`);
}
//#endregion
//#region src/lib/components/SettingsPanel.svelte
function SettingsPanel($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		/** @type {{ onClose: () => void }} */
		let { onClose } = $$props;
		const seedDate = () => {
			if (store_get($$store_subs ??= {}, "$settings", settings).dateOverride) {
				const { day, month, year } = store_get($$store_subs ??= {}, "$settings", settings).dateOverride;
				return {
					day,
					month,
					year
				};
			}
			const n = /* @__PURE__ */ new Date();
			return {
				day: n.getDate(),
				month: n.getMonth() + 1,
				year: n.getFullYear()
			};
		};
		const seedTime = () => {
			if (store_get($$store_subs ??= {}, "$settings", settings).timeOverride) {
				const { hour, minute } = store_get($$store_subs ??= {}, "$settings", settings).timeOverride;
				return {
					hour,
					minute
				};
			}
			const n = /* @__PURE__ */ new Date();
			return {
				hour: n.getHours(),
				minute: n.getMinutes()
			};
		};
		let manualDate = seedDate();
		let manualTime = seedTime();
		/** Zero-pad a number to two digits for the time inputs. */
		function padTwo(n) {
			return String(n).padStart(2, "0");
		}
		$$renderer.push(`<div class="overlay svelte-d580bl" role="dialog" aria-modal="true" aria-label="Settings"><div${attr_class("heading svelte-d580bl", void 0, { "test-active": store_get($$store_subs ??= {}, "$settings", settings).testMode })} role="button" tabindex="0">${escape_html(store_get($$store_subs ??= {}, "$settings", settings).testMode ? "Test Mode" : "Settings")}</div> <div class="rows svelte-d580bl"><div class="row svelte-d580bl"><span class="label svelte-d580bl">Date</span> <div class="options svelte-d580bl"><button${attr_class("opt svelte-d580bl", void 0, { "selected": store_get($$store_subs ??= {}, "$settings", settings).dateMode === "auto" })}>Auto</button> <span${attr_class("field-group svelte-d580bl", void 0, { "active": store_get($$store_subs ??= {}, "$settings", settings).dateMode === "manual" })} role="button" tabindex="0"><input class="field svelte-d580bl" type="number" min="1" max="31"${attr("value", manualDate.day)} placeholder="DD" aria-label="Day"/> <input class="field svelte-d580bl" type="number" min="1" max="12"${attr("value", manualDate.month)} placeholder="MM" aria-label="Month"/> <input class="field year svelte-d580bl" type="number" min="2000" max="2100"${attr("value", manualDate.year)} placeholder="YYYY" aria-label="Year"/></span></div></div> <div class="row svelte-d580bl"><span class="label svelte-d580bl">Time</span> <div class="options svelte-d580bl">`);
		if (store_get($$store_subs ??= {}, "$settings", settings).testMode) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<span class="opt selected svelte-d580bl">Test</span>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<button${attr_class("opt svelte-d580bl", void 0, { "selected": store_get($$store_subs ??= {}, "$settings", settings).timeMode === "auto" })}>Auto</button> <span${attr_class("field-group svelte-d580bl", void 0, { "active": store_get($$store_subs ??= {}, "$settings", settings).timeMode === "manual" })} role="button" tabindex="0"><input class="field svelte-d580bl" type="number" min="0" max="23"${attr("value", padTwo(manualTime.hour))} placeholder="HH" aria-label="Hour"/> <input class="field svelte-d580bl" type="number" min="0" max="59"${attr("value", padTwo(manualTime.minute))} placeholder="MM" aria-label="Minute"/></span>`);
		}
		$$renderer.push(`<!--]--></div></div> <div class="row svelte-d580bl"><span class="label svelte-d580bl">Update Time</span> <div class="options svelte-d580bl"><!--[-->`);
		const each_array = ensure_array_like(UPDATE_INTERVALS);
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let interval = each_array[$$index];
			$$renderer.push(`<button${attr_class("opt svelte-d580bl", void 0, { "selected": store_get($$store_subs ??= {}, "$settings", settings).updateInterval === interval })}>${escape_html(interval)}m</button>`);
		}
		$$renderer.push(`<!--]--></div></div> <div class="row svelte-d580bl"><span class="label svelte-d580bl">Display Exact Time</span> <div class="options svelte-d580bl"><button${attr_class("opt svelte-d580bl", void 0, { "selected": store_get($$store_subs ??= {}, "$settings", settings).displayExactTime === true })}>Yes</button> <button${attr_class("opt svelte-d580bl", void 0, { "selected": store_get($$store_subs ??= {}, "$settings", settings).displayExactTime === false })}>No</button></div></div> <div class="row svelte-d580bl"><span class="label svelte-d580bl">SFW Only</span> <div class="options svelte-d580bl"><button${attr_class("opt svelte-d580bl", void 0, { "selected": store_get($$store_subs ??= {}, "$settings", settings).sfwOnly === true })}>Yes</button> <button${attr_class("opt svelte-d580bl", void 0, { "selected": store_get($$store_subs ??= {}, "$settings", settings).sfwOnly === false })}>No</button></div></div> <div class="row svelte-d580bl"><span class="label svelte-d580bl">Invert</span> <div class="options svelte-d580bl"><button${attr_class("opt svelte-d580bl", void 0, { "selected": store_get($$store_subs ??= {}, "$settings", settings).invert === true })}>Yes</button> <button${attr_class("opt svelte-d580bl", void 0, { "selected": store_get($$store_subs ??= {}, "$settings", settings).invert === false })}>No</button></div></div> <div class="row svelte-d580bl"><span class="label svelte-d580bl">Theme</span> <div class="options svelte-d580bl"><!--[-->`);
		const each_array_1 = ensure_array_like(THEMES);
		for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
			let theme = each_array_1[$$index_1];
			$$renderer.push(`<button${attr_class("opt svelte-d580bl", void 0, { "selected": store_get($$store_subs ??= {}, "$settings", settings).theme === theme })}>${escape_html(theme.charAt(0).toUpperCase() + theme.slice(1))}</button>`);
		}
		$$renderer.push(`<!--]--></div></div></div> <button class="done svelte-d580bl">Done</button></div>`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
//#region src/routes/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let quote = null;
		let displayTime = getCurrentTime(store_get($$store_subs ??= {}, "$settings", settings));
		let displayDate = getCurrentDate(store_get($$store_subs ??= {}, "$settings", settings));
		let settingsOpen = false;
		let sizeClass = derived(() => quoteSizeClass(quote));
		let quoteTimer = null;
		let clockTimer = null;
		/** Fetch a new quote for the current effective time and refresh display values. */
		async function refreshQuote() {
			const time = getCurrentTime(store_get($$store_subs ??= {}, "$settings", settings));
			displayTime = time;
			displayDate = getCurrentDate(store_get($$store_subs ??= {}, "$settings", settings));
			const result = await loadQuote(time, store_get($$store_subs ??= {}, "$settings", settings));
			if (result !== null) quote = result;
		}
		/**
		* Schedule the next automatic quote refresh aligned to the interval boundary.
		* Clears any pending timer first so only one is ever active.
		*/
		function scheduleNextQuote() {
			clearTimeout(quoteTimer);
			const delay = msUntilNextTick(store_get($$store_subs ??= {}, "$settings", settings).updateInterval);
			quoteTimer = setTimeout(async () => {
				await refreshQuote();
				scheduleNextQuote();
			}, delay);
		}
		onDestroy(() => {
			clearTimeout(quoteTimer);
			clearInterval(clockTimer);
		});
		$$renderer.push(`<div class="page svelte-1uha8ag">`);
		DateHeader($$renderer, {
			formattedDate: formatDate(displayDate),
			formattedTime: formatTime(displayTime),
			displayExactTime: store_get($$store_subs ??= {}, "$settings", settings).displayExactTime,
			onSettingsOpen: () => settingsOpen = true
		});
		$$renderer.push(`<!----> `);
		if (quote) {
			$$renderer.push("<!--[0-->");
			QuoteDisplay($$renderer, { quote });
			$$renderer.push(`<!----> <div${attr_class("attribution-row svelte-1uha8ag", void 0, {
				"q-s": sizeClass() === "q-s",
				"q-m": sizeClass() === "q-m",
				"q-l": sizeClass() === "q-l",
				"q-xl": sizeClass() === "q-xl"
			})}>`);
			Attribution($$renderer, {
				title: quote.title,
				author: quote.author
			});
			$$renderer.push(`<!----></div>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="empty-state svelte-1uha8ag" aria-hidden="true"><span class="em-dash svelte-1uha8ag">—</span></div>`);
		}
		$$renderer.push(`<!--]--></div> `);
		if (settingsOpen) {
			$$renderer.push("<!--[0-->");
			SettingsPanel($$renderer, { onClose: () => settingsOpen = false });
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if ($$store_subs) unsubscribe_stores($$store_subs);
	});
}
//#endregion
export { _page as default };
