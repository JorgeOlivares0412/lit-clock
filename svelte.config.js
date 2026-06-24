// SvelteKit configuration for lit-clock.
// Uses adapter-static to produce a fully prerendered static site for GitHub Pages.
// The base path must match the GitHub repo name so asset URLs resolve correctly.

import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Enable Svelte 5 runes mode for all files except node_modules
	compilerOptions: {
		runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
	},
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			// 404.html used as SPA fallback — GitHub Pages serves it for unknown paths
			fallback: '404.html',
			precompress: false,
			strict: true
		}),
		paths: {
			// In production the site lives at https://<user>.github.io/lit-clock/
			// The repo name must match this base path exactly.
			base: process.env.NODE_ENV === 'production' ? '/lit-clock' : ''
		}
	}
};

export default config;
