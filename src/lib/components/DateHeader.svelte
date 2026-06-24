<!-- DateHeader shows the current date (always) and clock time (when displayExactTime is on).
     The hidden 4-tap gesture on the whole header opens the Settings panel.
     Uses the shared tapGesture Svelte action instead of an inline counter. -->
<script>
	import { tapGesture } from '$lib/actions/tapGesture.js';

	/**
	 * @type {{
	 *   formattedDate: string,
	 *   formattedTime: string,
	 *   displayExactTime: boolean,
	 *   onSettingsOpen: () => void
	 * }}
	 */
	let { formattedDate, formattedTime, displayExactTime, onSettingsOpen } = $props();
</script>

<!-- role="button" + tabindex make the header keyboard-focusable for a11y.
     The tapGesture action handles both click counting and Enter keydown. -->
<header
	class="date-header"
	role="button"
	tabindex="0"
	aria-label="Date and time. Tap four times quickly to open settings."
	use:tapGesture={() => onSettingsOpen()}
>
	<p class="date">{formattedDate}</p>
	{#if displayExactTime}
		<p class="clock">{formattedTime}</p>
	{/if}
</header>

<style>
	.date-header {
		flex-shrink: 0;
		text-align: center;
		padding: 1.75rem 1rem 1rem;
		cursor: default;
		user-select: none;
		outline: none;
		/* Expand touch target without affecting layout */
		-webkit-tap-highlight-color: transparent;
	}

	.date,
	.clock {
		font-family: var(--font-header);
		font-size: var(--date-size);
		color: var(--text-muted);
		letter-spacing: 0.06em;
		line-height: 1.8;
		font-weight: 700;
		text-transform: uppercase;
	}

	/* Landscape phones: compress header — must be last to override tablet width query */
	@media (orientation: landscape) and (max-height: 600px) {
		.date-header { padding: 0.4rem 1rem 0.3rem; }
	}
</style>
