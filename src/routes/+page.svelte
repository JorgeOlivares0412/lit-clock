<!-- Main page — orchestrates the quote cycle, clock tick, and settings panel.
     Uses Svelte 5 runes ($state, $derived, $effect) for reactivity.
     The reactivity has been simplified vs. the original: instead of tracking
     prevInterval/prevSfw/prevTestMode manually, we let $effect auto-track
     those dependencies by reading them inside the effect body. -->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { settings } from '$lib/stores/settings.js';
	import {
		getCurrentTime,
		getCurrentDate,
		formatDate,
		formatTime,
		msUntilNextTick
	} from '$lib/utils/timeUtils.js';
	import { loadQuote } from '$lib/utils/quoteLoader.js';
	import { quoteSizeClass } from '$lib/utils/quoteSize.js';
	import DateHeader from '$lib/components/DateHeader.svelte';
	import QuoteDisplay from '$lib/components/QuoteDisplay.svelte';
	import Attribution from '$lib/components/Attribution.svelte';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';

	// ── State ──────────────────────────────────────────────────────
	let quote = $state(null);
	let displayTime = $state(getCurrentTime($settings));
	let displayDate = $state(getCurrentDate($settings));
	let settingsOpen = $state(false);

	// Derive the size class from the current quote so the attribution row
	// gets the same tier class without duplicating the threshold logic.
	let sizeClass = $derived(quoteSizeClass(quote));

	// ── Timers ─────────────────────────────────────────────────────
	let quoteTimer = null;
	let clockTimer = null;

	/** Fetch a new quote for the current effective time and refresh display values. */
	async function refreshQuote() {
		const time = getCurrentTime($settings);
		displayTime = time;
		displayDate = getCurrentDate($settings);
		const result = await loadQuote(time, $settings);
		if (result !== null) quote = result;
	}

	/**
	 * Schedule the next automatic quote refresh aligned to the interval boundary.
	 * Clears any pending timer first so only one is ever active.
	 */
	function scheduleNextQuote() {
		clearTimeout(quoteTimer);
		const delay = msUntilNextTick($settings.updateInterval);
		quoteTimer = setTimeout(async () => {
			await refreshQuote();
			scheduleNextQuote(); // reschedule for the following boundary
		}, delay);
	}

	/** 1-second interval that keeps the displayed time/date current. */
	function startClockTick() {
		clockTimer = setInterval(() => {
			displayTime = getCurrentTime($settings);
			displayDate = getCurrentDate($settings);
		}, 1000);
	}

	// ── Reactive quote refresh ────────────────────────────────────
	// Reading updateInterval, sfwOnly, and testMode inside this $effect registers
	// them as reactive dependencies. Svelte re-runs the effect whenever any of
	// them changes — replacing the manual prevInterval/prevSfw/prevTestMode
	// bookkeeping from the original. On initial mount the effect runs once; the
	// actual first fetch + schedule is done in onMount so there's no double-fetch.
	let mounted = $state(false);
	$effect(() => {
		// Touch the three settings that should trigger a fresh quote + reschedule.
		// Destructuring (rather than reading $settings directly) keeps the
		// dependency list tight — other settings changes don't cause a refetch.
		const { updateInterval, sfwOnly, testMode } = $settings;

		// Guard: skip the effect-triggered refresh on first run; onMount handles it.
		if (!mounted) return;

		// Re-fetch and restart the scheduler with the new settings.
		// (void the promise — errors are handled inside refreshQuote/loadQuote)
		void refreshQuote();
		scheduleNextQuote();

		// Suppress the "unused variable" lint warning — we read them for reactivity
		void updateInterval; void sfwOnly; void testMode;
	});

	// ── Display sync ──────────────────────────────────────────────
	// Keep on-screen date/time in sync immediately when manual overrides change
	// (e.g. user edits the time in Settings). Without this the clock only updates
	// on the next 1-second clockTimer tick.
	$effect(() => {
		displayTime = getCurrentTime($settings);
		displayDate = getCurrentDate($settings);
	});

	onMount(() => {
		mounted = true;
		refreshQuote();
		scheduleNextQuote();
		startClockTick();
	});

	onDestroy(() => {
		clearTimeout(quoteTimer);
		clearInterval(clockTimer);
	});
</script>

<div class="page">
	<DateHeader
		formattedDate={formatDate(displayDate)}
		formattedTime={formatTime(displayTime)}
		displayExactTime={$settings.displayExactTime}
		onSettingsOpen={() => (settingsOpen = true)}
	/>

	{#if quote}
		<QuoteDisplay {quote} />
		<!-- Attribution row uses the same size tier as the quote so title/author
		     scale identically. Attribution.svelte inherits font-size from here. -->
		<div
			class="attribution-row"
			class:q-s={sizeClass === 'q-s'}
			class:q-m={sizeClass === 'q-m'}
			class:q-l={sizeClass === 'q-l'}
			class:q-xl={sizeClass === 'q-xl'}
		>
			<Attribution title={quote.title} author={quote.author} />
		</div>
	{:else}
		<!-- Empty / loading state: an em-dash that holds the flex layout
		     while the first quote is being fetched -->
		<div class="empty-state" aria-hidden="true">
			<span class="em-dash">—</span>
		</div>
	{/if}
</div>

{#if settingsOpen}
	<SettingsPanel onClose={() => (settingsOpen = false)} />
{/if}

<style>
	.page {
		/* --app-height is set by the iOS viewport fix in +layout.svelte.
		   Falls back to 100% if JS hasn't run yet (e.g. prerender). */
		height: var(--app-height, 100%);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		background-color: var(--bg);
		/* Safe area insets for iPhone notch / home indicator / Dynamic Island.
		   max() ensures at least 0.5rem breathing room even when env() = 0. */
		padding-top:    max(0.5rem, env(safe-area-inset-top,    0px));
		padding-bottom: max(0.5rem, env(safe-area-inset-bottom, 0px));
		padding-left:   env(safe-area-inset-left,  0px);
		padding-right:  env(safe-area-inset-right, 0px);
	}

	/* Staggered attribution: left ~28% is empty, matching the mockup */
	.attribution-row {
		padding-left: 28%;
	}

	/* Attribution font size matches the current quote tier — same clamp values
	   as QuoteDisplay so title/author scale identically to the quote text.
	   Attribution.svelte uses font-size: inherit to pick this up.
	   NOTE: if you change these values, also update the matching rules in
	   QuoteDisplay.svelte so the two stay in sync. */
	.attribution-row.q-s  { font-size: clamp(1.1rem,  min(5.5dvh, 8vw),   var(--qd-s)); }
	.attribution-row.q-m  { font-size: clamp(0.95rem, min(4.2dvh, 5.5vw),  var(--qd-m)); }
	.attribution-row.q-l  { font-size: clamp(0.82rem, min(3.4dvh, 4.5vw),  var(--qd-l)); }
	.attribution-row.q-xl { font-size: clamp(0.72rem, min(2.7dvh, 3.8vw),  1.2rem);      }

	/* Empty / loading state — holds the flex layout without showing anything */
	.empty-state {
		flex: 1;
		display: flex;
		align-items: center;
		padding: 1.75rem;
	}

	.em-dash {
		font-family: var(--font-body);
		font-size: 1.3rem;
		color: var(--text-muted);
		opacity: 0.4;
	}

	/* ── Tablet ── */
	@media (min-width: 600px) {
		.attribution-row { padding-left: 30%; }
		.empty-state { padding: 2rem 2.5rem; }
	}

	/* ── Desktop: constrain max width for readability ── */
	@media (min-width: 1024px) {
		.page {
			max-width: 860px;
			margin: 0 auto;
		}
		.attribution-row { padding-left: 32%; }
		.empty-state { padding: 2.5rem 3.5rem; }
	}

	/* ── Landscape phones — attribution font overrides, mirrors QuoteDisplay ── */
	@media (orientation: landscape) and (max-height: 600px) {
		.attribution-row.q-s  { font-size: clamp(1.0rem,  6.5dvh, var(--qd-s)); }
		.attribution-row.q-m  { font-size: clamp(0.9rem,  5.5dvh, var(--qd-m)); }
		.attribution-row.q-l  { font-size: clamp(0.78rem, 4.0dvh, var(--qd-l)); }
		.attribution-row.q-xl { font-size: clamp(0.68rem, 3.2dvh, 1.0rem);      }
	}
</style>
