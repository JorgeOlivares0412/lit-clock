// Single source of truth for mapping a quote's character count to its size tier.
// Both QuoteDisplay.svelte and +page.svelte import from here so the thresholds
// and class names never drift out of sync.

import { SIZE_THRESHOLDS } from '../constants.js';

/**
 * Total visible character count of a quote (all three text segments combined).
 * Used to pick the right font-size tier.
 *
 * @param {{ quote_first?: string, quote_time_case?: string, quote_last?: string } | null} quote
 * @returns {number}
 */
export function quoteCharCount(quote) {
	if (!quote) return 0;
	return (quote.quote_first ?? '').length
	     + (quote.quote_time_case ?? '').length
	     + (quote.quote_last ?? '').length;
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
export function quoteSizeClass(quote) {
	const n = quoteCharCount(quote);
	if (n < SIZE_THRESHOLDS.s) return 'q-s';
	if (n < SIZE_THRESHOLDS.m) return 'q-m';
	if (n < SIZE_THRESHOLDS.l) return 'q-l';
	return 'q-xl';
}
