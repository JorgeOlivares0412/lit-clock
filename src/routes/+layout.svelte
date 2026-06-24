<!-- Root layout — loaded once for all routes.
     Imports global CSS, wires up the iOS viewport-height fix, and keeps
     <html data-theme> and <html data-invert> in sync with the settings store. -->
<script>
	import { onMount } from 'svelte';
	import '../app.css';
	import { settings } from '$lib/stores/settings.js';

	let { children } = $props();

	// ── iOS PWA viewport-height fix ────────────────────────────────
	// In iOS standalone (home screen) mode, window.innerHeight can report the
	// portrait height even when the device launched in landscape, because no
	// resize/orientationchange fires if the orientation hasn't changed since
	// the icon was tapped. window.visualViewport.height is always correct.
	//
	// We write the height into --app-height which .page in +page.svelte uses
	// instead of 100vh (dvh still has edge cases in iOS standalone).
	onMount(() => {
		function updateAppHeight() {
			const height = window.visualViewport
				? window.visualViewport.height
				: window.innerHeight;
			document.documentElement.style.setProperty('--app-height', `${height}px`);
		}

		// Run immediately, then retry — iOS PWA can take a few frames to settle
		// into the correct orientation on initial launch.
		updateAppHeight();
		const t1 = setTimeout(updateAppHeight, 100);
		const t2 = setTimeout(updateAppHeight, 500);

		// visualViewport fires more reliably than window.resize in iOS PWA
		const vvp = window.visualViewport;
		if (vvp) {
			vvp.addEventListener('resize', updateAppHeight);
		}
		window.addEventListener('resize', updateAppHeight);
		window.addEventListener('orientationchange', () => {
			// iOS updates innerHeight after a short delay on rotation
			setTimeout(updateAppHeight, 100);
			setTimeout(updateAppHeight, 500);
		});

		return () => {
			clearTimeout(t1);
			clearTimeout(t2);
			if (vvp) vvp.removeEventListener('resize', updateAppHeight);
			window.removeEventListener('resize', updateAppHeight);
		};
	});

	// ── Theme sync ─────────────────────────────────────────────────
	// Keep <html data-theme> and <html data-invert> in sync with the settings
	// store. CSS selectors in paper.css key off these two attributes.

	$effect(() => {
		document.documentElement.setAttribute('data-theme', $settings.theme);
	});
	$effect(() => {
		if ($settings.invert) {
			document.documentElement.setAttribute('data-invert', 'true');
		} else {
			document.documentElement.removeAttribute('data-invert');
		}
	});
</script>

{@render children()}
