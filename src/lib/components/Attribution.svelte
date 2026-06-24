<!-- Attribution component — displays the book title and author below the quote.
     Font size is set to `inherit` so the parent .attribution-row class controls
     the size tier (q-s / q-m / q-l / q-xl), keeping quote and attribution in sync. -->
<script>
	/** @type {{ title: string, author: string }} */
	let { title, author } = $props();
</script>

<div class="attribution">
	<p class="title">{title}</p>
	<p class="author">{author}</p>
</div>

<style>
	.attribution {
		flex-shrink: 0;
		text-align: right;
		padding: 1rem 1.75rem 2.25rem;
		user-select: none;
	}

	.title,
	.author {
		font-family: var(--font-body);
		/* inherit picks up the clamp() tier set by .attribution-row in +page.svelte */
		font-size: inherit;
		color: var(--text-primary);
		line-height: 1.7;
		font-weight: var(--font-weight-body);
	}

	@media (min-width: 600px) {
		.attribution { padding: 1rem 2.5rem 2.5rem; }
	}

	@media (min-width: 1024px) {
		.attribution { padding: 1.25rem 3.5rem 3rem; }
	}

	/* Landscape phones: compress footer — must be last to override tablet width query.
	   No env(safe-area-inset-bottom) here; .page already handles it. */
	@media (orientation: landscape) and (max-height: 600px) {
		.attribution { padding: 0.3rem 1.75rem 0.4rem; }
	}
</style>
