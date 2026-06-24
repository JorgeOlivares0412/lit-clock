<!-- QuoteDisplay renders the three-part quote: quote_first + BOLD quote_time_case + quote_last.
     white-space: pre-line preserves \n characters produced by sanitizeText (from <br> tags).
     Font sizing uses the shared quoteSizeClass() util so thresholds stay in one place. -->
<script>
	/**
	 * @type {{
	 *   quote: {
	 *     quote_first: string,
	 *     quote_time_case: string,
	 *     quote_last: string
	 *   }
	 * }}
	 */
	let { quote } = $props();

	// Import the shared size-tier util to avoid duplicating the threshold logic here
	// and in +page.svelte (where the same class is needed for the attribution row).
	import { quoteSizeClass } from '$lib/utils/quoteSize.js';

	// Reactively recompute whenever quote changes
	let sizeClass = $derived(quoteSizeClass(quote));
</script>

<div class="quote-wrapper">
	<blockquote class="quote-text {sizeClass}">
		{quote.quote_first}<strong>{quote.quote_time_case}</strong>{quote.quote_last}
	</blockquote>
</div>

<style>
	.quote-wrapper {
		flex: 1;
		min-height: 0;
		display: flex;
		align-items: center;
		padding: 1.5rem 1.75rem;
		overflow: hidden;
	}

	.quote-text {
		font-family: var(--font-body);
		line-height: var(--quote-leading);
		color: var(--text-primary);
		font-weight: var(--font-weight-body);
		font-style: normal;
		text-align: left;
		width: 100%;
		/* Preserves \n characters injected by sanitizeText (originally <br> tags) */
		white-space: pre-line;
	}

	/*
	 * Font sizes use min(dvh, vw) as the preferred value so the font
	 * is constrained by BOTH viewport height (prevents overflow when
	 * the frame is short) and viewport width (prevents text getting
	 * huge on narrow portrait phones where dvh would allow it).
	 * --qd-s/m/l are defined per theme in paper.css; the xl cap is fixed.
	 */
	.q-s  { font-size: clamp(1.1rem,  min(5.5dvh, 8vw),   var(--qd-s)); }
	.q-m  { font-size: clamp(0.95rem, min(4.2dvh, 5.5vw),  var(--qd-m)); }
	.q-l  { font-size: clamp(0.82rem, min(3.4dvh, 4.5vw),  var(--qd-l)); }
	.q-xl { font-size: clamp(0.72rem, min(2.7dvh, 3.8vw),  1.2rem);      }

	/* Bolded time phrase — weight only, no size shift */
	.quote-text :global(strong) {
		font-weight: var(--font-weight-strong);
		font-style: normal;
	}

	/* ── Tablet ── */
	@media (min-width: 600px) {
		.quote-wrapper { padding: 2rem 2.5rem; }
	}

	/* ── Desktop ── */
	@media (min-width: 1024px) {
		.quote-wrapper { padding: 2.5rem 3.5rem; }
	}

	/*
	 * Landscape phones — must be last to override the tablet width query above.
	 * A landscape iPhone is ~844px wide so it would match the tablet breakpoint
	 * without this override. dvh coefficients are conservative for q-l and q-xl:
	 * the wider viewport allows more chars per line so the same text needs fewer
	 * lines, but the short viewport (after header, attribution, safe-area padding)
	 * leaves only ~260px for the quote area.
	 */
	@media (orientation: landscape) and (max-height: 600px) {
		.quote-wrapper { padding: 0.5rem 1.75rem; }
		.q-s  { font-size: clamp(1.0rem,  6.5dvh, var(--qd-s)); }
		.q-m  { font-size: clamp(0.9rem,  5.5dvh, var(--qd-m)); }
		.q-l  { font-size: clamp(0.78rem, 4.0dvh, var(--qd-l)); }
		.q-xl { font-size: clamp(0.68rem, 3.2dvh, 1.0rem);      }
	}
</style>
