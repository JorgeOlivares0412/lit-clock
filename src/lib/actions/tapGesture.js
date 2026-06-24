// Svelte action for detecting a rapid multi-tap / multi-click gesture.
// Used by DateHeader (4 taps → open settings) and SettingsPanel heading
// (4 taps → toggle test mode) to avoid duplicating the counter logic.
//
// Usage in markup:
//   <header use:tapGesture={() => openSettings()}>...</header>
//
// The action fires onActivate() once TAP_COUNT taps happen within TAP_WINDOW_MS.
// It also handles Enter keydown so keyboard users can trigger the gesture.

import { TAP_COUNT, TAP_WINDOW_MS } from '../constants.js';

/**
 * Svelte action: attach to any element to detect the hidden tap gesture.
 * @param {HTMLElement} node  - the element to listen on
 * @param {() => void} onActivate - callback fired when the gesture completes
 * @returns {{ update: (next: () => void) => void, destroy: () => void }}
 */
export function tapGesture(node, onActivate) {
	let count = 0;
	let timer = null;

	function handle() {
		count++;
		clearTimeout(timer);

		if (count >= TAP_COUNT) {
			// Gesture completed — reset and fire
			count = 0;
			onActivate?.();
			return;
		}

		// Partial count: reset after the window expires if no more taps come in
		timer = setTimeout(() => { count = 0; }, TAP_WINDOW_MS);
	}

	// Keyboard support: treat Enter as a tap so the gesture works with Tab focus
	function onKey(e) { if (e.key === 'Enter') handle(); }

	node.addEventListener('click', handle);
	node.addEventListener('keydown', onKey);

	return {
		// Called by Svelte if the bound expression changes (e.g. reactive callback)
		update(next) { onActivate = next; },
		destroy() {
			clearTimeout(timer);
			node.removeEventListener('click', handle);
			node.removeEventListener('keydown', onKey);
		}
	};
}
