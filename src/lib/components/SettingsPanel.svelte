<!-- SettingsPanel — full-screen overlay for all user-configurable options.
     The heading has a hidden 4-tap gesture (via tapGesture action) that toggles
     test mode. UPDATE_INTERVALS and THEMES from constants.js drive the each loops.
     All manual date/time input logic is kept verbatim from the original. -->
<script>
	import { settings } from '$lib/stores/settings.js';
	import { tapGesture } from '$lib/actions/tapGesture.js';
	import { UPDATE_INTERVALS, THEMES } from '$lib/constants.js';

	/** @type {{ onClose: () => void }} */
	let { onClose } = $props();

	// ── Manual field seeding ───────────────────────────────────────
	// Seed the manual input fields from the stored override values.
	// We strip setAt so the inputs always show the user's starting point,
	// not a time that's been ticking forward since the override was saved.

	const seedDate = () => {
		if ($settings.dateOverride) {
			const { day, month, year } = $settings.dateOverride;
			return { day, month, year };
		}
		const n = new Date();
		return { day: n.getDate(), month: n.getMonth() + 1, year: n.getFullYear() };
	};

	const seedTime = () => {
		if ($settings.timeOverride) {
			const { hour, minute } = $settings.timeOverride;
			return { hour, minute };
		}
		const n = new Date();
		return { hour: n.getHours(), minute: n.getMinutes() };
	};

	let manualDate = $state(seedDate());
	let manualTime = $state(seedTime());

	// ── Mode setters ──────────────────────────────────────────────
	// Switching to manual immediately saves the current field values with a
	// fresh setAt so the clock starts ticking from now.

	function setDateMode(mode) {
		if (mode === 'auto') {
			settings.update({ dateMode: 'auto', dateOverride: null });
		} else {
			settings.update({ dateMode: 'manual', dateOverride: { ...manualDate, setAt: Date.now() } });
		}
	}

	function setTimeMode(mode) {
		if (mode === 'auto') {
			settings.update({ timeMode: 'auto', timeOverride: null });
		} else {
			settings.update({ timeMode: 'manual', timeOverride: { ...manualTime, setAt: Date.now() } });
		}
	}

	// ── Field change handlers ─────────────────────────────────────
	// Clamp values to valid ranges before saving. setAt is refreshed so the
	// ticking restarts from "now" whenever the user edits a field.

	function onDateField(field, raw) {
		const val = parseInt(raw, 10);
		if (isNaN(val)) return;
		// day: 1–31, month: 1–12, year: 2000–2100
		const limits = { day: [1, 31], month: [1, 12], year: [2000, 2100] };
		const [min, max] = limits[field];
		manualDate = { ...manualDate, [field]: Math.min(max, Math.max(min, val)) };
		settings.update({ dateMode: 'manual', dateOverride: { ...manualDate, setAt: Date.now() } });
	}

	function onTimeField(field, raw) {
		const val = parseInt(raw, 10);
		if (isNaN(val)) return;
		// hour: 0–23, minute: 0–59
		const max = field === 'hour' ? 23 : 59;
		manualTime = { ...manualTime, [field]: Math.min(max, Math.max(0, val)) };
		settings.update({ timeMode: 'manual', timeOverride: { ...manualTime, setAt: Date.now() } });
	}

	/** Zero-pad a number to two digits for the time inputs. */
	function padTwo(n) {
		return String(n).padStart(2, '0');
	}

	// ── Activate-on-focus helpers ─────────────────────────────────
	// Clicking or focusing a manual field automatically switches to manual
	// mode without needing to click the "Auto" button first.

	function activateDateManual() {
		if ($settings.dateMode !== 'manual') setDateMode('manual');
	}
	function activateTimeManual() {
		if ($settings.timeMode !== 'manual') setTimeMode('manual');
	}
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-label="Settings">
	<!-- Heading doubles as the hidden test-mode toggle: 4 taps via tapGesture action.
	     The heading text changes to "Test Mode" as a subtle visual indicator.
	     Uses <div> (not <p>) so role="button" satisfies the a11y non-interactive rule. -->
	<div
		class="heading"
		class:test-active={$settings.testMode}
		role="button"
		tabindex="0"
		use:tapGesture={() => settings.update({ testMode: !$settings.testMode })}
	>{$settings.testMode ? 'Test Mode' : 'Settings'}</div>

	<div class="rows">

		<!-- Date -->
		<div class="row">
			<span class="label">Date</span>
			<div class="options">
				<button
					class="opt"
					class:selected={$settings.dateMode === 'auto'}
					onclick={() => setDateMode('auto')}
				>Auto</button>

				<!-- Manual date fields — always visible, active when manual mode on.
				     Clicking the group switches to manual mode automatically. -->
				<span
					class="field-group"
					class:active={$settings.dateMode === 'manual'}
					role="button"
					tabindex="0"
					onclick={activateDateManual}
					onkeydown={(e) => e.key === 'Enter' && activateDateManual()}
				>
					<input
						class="field"
						type="number"
						min="1" max="31"
						value={manualDate.day}
						placeholder="DD"
						aria-label="Day"
						onfocus={activateDateManual}
						onchange={(e) => onDateField('day', e.currentTarget.value)}
					/>
					<input
						class="field"
						type="number"
						min="1" max="12"
						value={manualDate.month}
						placeholder="MM"
						aria-label="Month"
						onfocus={activateDateManual}
						onchange={(e) => onDateField('month', e.currentTarget.value)}
					/>
					<input
						class="field year"
						type="number"
						min="2000" max="2100"
						value={manualDate.year}
						placeholder="YYYY"
						aria-label="Year"
						onfocus={activateDateManual}
						onchange={(e) => onDateField('year', e.currentTarget.value)}
					/>
				</span>
			</div>
		</div>

		<!-- Time -->
		<div class="row">
			<span class="label">Time</span>
			<div class="options">
				{#if $settings.testMode}
					<!-- In test mode the time source is irrelevant; show "Test" and preserve
					     the underlying timeMode/timeOverride for when test mode is turned off. -->
					<span class="opt selected">Test</span>
				{:else}
					<button
						class="opt"
						class:selected={$settings.timeMode === 'auto'}
						onclick={() => setTimeMode('auto')}
					>Auto</button>

					<span
						class="field-group"
						class:active={$settings.timeMode === 'manual'}
						role="button"
						tabindex="0"
						onclick={activateTimeManual}
						onkeydown={(e) => e.key === 'Enter' && activateTimeManual()}
					>
						<input
							class="field"
							type="number"
							min="0" max="23"
							value={padTwo(manualTime.hour)}
							placeholder="HH"
							aria-label="Hour"
							onfocus={activateTimeManual}
							onchange={(e) => onTimeField('hour', e.currentTarget.value)}
						/>
						<input
							class="field"
							type="number"
							min="0" max="59"
							value={padTwo(manualTime.minute)}
							placeholder="MM"
							aria-label="Minute"
							onfocus={activateTimeManual}
							onchange={(e) => onTimeField('minute', e.currentTarget.value)}
						/>
					</span>
				{/if}
			</div>
		</div>

		<!-- Update Time — uses UPDATE_INTERVALS from constants.js -->
		<div class="row">
			<span class="label">Update Time</span>
			<div class="options">
				{#each UPDATE_INTERVALS as interval}
					<button
						class="opt"
						class:selected={$settings.updateInterval === interval}
						onclick={() => settings.update({ updateInterval: interval })}
					>{interval}m</button>
				{/each}
			</div>
		</div>

		<!-- Display Exact Time -->
		<div class="row">
			<span class="label">Display Exact Time</span>
			<div class="options">
				<button
					class="opt"
					class:selected={$settings.displayExactTime === true}
					onclick={() => settings.update({ displayExactTime: true })}
				>Yes</button>
				<button
					class="opt"
					class:selected={$settings.displayExactTime === false}
					onclick={() => settings.update({ displayExactTime: false })}
				>No</button>
			</div>
		</div>

		<!-- SFW Only -->
		<div class="row">
			<span class="label">SFW Only</span>
			<div class="options">
				<button
					class="opt"
					class:selected={$settings.sfwOnly === true}
					onclick={() => settings.update({ sfwOnly: true })}
				>Yes</button>
				<button
					class="opt"
					class:selected={$settings.sfwOnly === false}
					onclick={() => settings.update({ sfwOnly: false })}
				>No</button>
			</div>
		</div>

		<!-- Invert -->
		<div class="row">
			<span class="label">Invert</span>
			<div class="options">
				<button
					class="opt"
					class:selected={$settings.invert === true}
					onclick={() => settings.update({ invert: true })}
				>Yes</button>
				<button
					class="opt"
					class:selected={$settings.invert === false}
					onclick={() => settings.update({ invert: false })}
				>No</button>
			</div>
		</div>

		<!-- Theme — uses THEMES from constants.js -->
		<div class="row">
			<span class="label">Theme</span>
			<div class="options">
				{#each THEMES as theme}
					<button
						class="opt"
						class:selected={$settings.theme === theme}
						onclick={() => settings.update({ theme })}
					>{theme.charAt(0).toUpperCase() + theme.slice(1)}</button>
				{/each}
			</div>
		</div>

	</div>

	<button class="done" onclick={onClose}>Done</button>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: var(--bg);
		z-index: 100;
		display: flex;
		flex-direction: column;
		padding: 1.5rem 1.5rem 2.5rem;
		overflow-y: auto;
	}

	/* Settings heading matches the date header style */
	.heading {
		font-family: var(--font-header);
		font-size: var(--date-size);
		color: var(--text-muted);
		letter-spacing: 0.06em;
		font-weight: 700;
		text-transform: uppercase;
		text-align: center;
		padding: 0.5rem 0 2rem;
		cursor: default;
		-webkit-tap-highlight-color: transparent;
		outline: none;
	}
	/* Subtle indicator when test mode is active — heading goes full-opacity */
	.heading.test-active {
		color: var(--text-primary);
	}

	.rows {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.6rem 0;
		gap: 1rem;
	}

	.label {
		font-family: var(--font-body);
		font-size: 1.05rem;
		color: var(--text-primary);
		font-weight: var(--font-weight-body);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.options {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	/* Option buttons — plain weight at rest, bold when selected */
	.opt {
		font-family: var(--font-body);
		font-size: 1.05rem;
		font-weight: var(--font-weight-body);
		color: var(--text-primary);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition: opacity 0.1s;
	}
	.opt:hover { opacity: 0.6; }
	.opt:focus { outline: none; }
	.opt.selected { font-weight: var(--font-weight-strong); }

	/* Manual field group — muted when inactive, full colour when active */
	.field-group {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		cursor: pointer;
		opacity: 0.35;
		transition: opacity 0.15s;
	}
	.field-group.active { opacity: 1; font-weight: var(--font-weight-strong); }
	.field-group:focus { outline: none; }

	/* Number inputs styled to look like plain text */
	.field {
		font-family: var(--font-body);
		font-size: 1.05rem;
		color: var(--text-primary);
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--border);
		width: 3ch;
		text-align: center;
		padding: 0 0.1rem 0.1rem;
		/* Hide the spinner arrows */
		appearance: textfield;
		-moz-appearance: textfield;
	}
	.field::-webkit-outer-spin-button,
	.field::-webkit-inner-spin-button { -webkit-appearance: none; }
	.field:focus {
		outline: none;
		border-bottom-color: var(--text-primary);
	}
	.field.year { width: 5ch; }

	/* Done button */
	.done {
		font-family: var(--font-body);
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text-primary);
		background: none;
		border: none;
		cursor: pointer;
		padding: 1rem;
		margin-top: 1.5rem;
		align-self: center;
		-webkit-tap-highlight-color: transparent;
	}
	.done:hover { opacity: 0.6; }

	/* Tighter layout on small screens */
	@media (max-width: 380px) {
		.label { font-size: 0.95rem; }
		.opt, .field { font-size: 0.95rem; }
		.options { gap: 0.6rem; }
	}
</style>
