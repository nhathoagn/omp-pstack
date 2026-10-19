/**
 * pstack extension for omp: the status line and lane routing.
 *
 * Status line. Draws exactly one line, `pstack: poteto-mode`, and only in a
 * session where poteto-mode has actually been activated. Activation is a
 * one-way latch: once set it never clears, so a `/resume`, a re-render, or a
 * late-arriving status surface still shows the line.
 *
 * Lanes. `task` takes no model for ordinary agents, so spawned roles name their
 * lane through agent frontmatter and through a `lane: @pstack-x` tag in the
 * brief. See `./lanes.js` for the resolution order.
 *
 * Design constraints, in order of importance:
 *   1. Never break a session. Every handler body is wrapped, every context
 *      lookup is optional-chained. A failed draw or an unroutable spawn is a
 *      no-op.
 *   2. Event-driven only. No timers, no polling, no network.
 *   3. Cheap. Handlers inspect already-materialized payloads and return.
 */
import { registerLaneRouting } from "./lanes.js";

/** Status-line key omp renders the line under. */
export const STATUS_KEY = "pstack";

/** The single line this extension draws. */
export const STATUS_TEXT = "pstack: poteto-mode";

/** URL omp serves a bundled skill file through. */
export const SKILL_URI = "skill://poteto-mode";

/** Path suffix that identifies poteto-mode's SKILL.md on disk. */
export const SKILL_PATH = "skills/poteto-mode/SKILL.md";

/**
 * Marker omp embeds in the user turn when a `/skill:` command dispatches.
 * Full text: `[IMPORTANT: User invoked the "<name>" skill; ...]`.
 */
export const DISPATCH_MARKER = 'User invoked the "poteto-mode" skill';

/**
 * True when a user turn carries the poteto-mode dispatch marker.
 *
 * The quoted-skill phrase is what makes this precise: prose that merely names
 * poteto-mode, or a playbook that mentions it, never matches.
 *
 * @param {unknown} text
 * @returns {boolean}
 */
export function isActivationText(text) {
	return typeof text === "string" && text.includes(DISPATCH_MARKER);
}

/**
 * Flatten a message body into text.
 *
 * omp writes a user message either as a bare string or as an array of blocks
 * shaped `{ type: "text", text }`. Anything else contributes nothing.
 *
 * @param {unknown} content
 * @returns {string}
 */
export function messageText(content) {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	let out = "";
	for (const block of content) {
		if (block && typeof block === "object" && block.type === "text" && typeof block.text === "string") {
			out += block.text;
		}
	}
	return out;
}

/**
 * True when tool-call arguments read the poteto-mode skill, by URL or by path.
 *
 * `args` arrives as a parsed object from live events and as a JSON string from
 * persisted journal entries, so both shapes are accepted.
 *
 * @param {unknown} args
 * @returns {boolean}
 */
export function argsActivate(args) {
	let text;
	if (typeof args === "string") text = args;
	else if (args && typeof args === "object") {
		try {
			text = JSON.stringify(args);
		} catch {
			return false;
		}
	} else return false;
	return text.includes(SKILL_URI) || text.includes(SKILL_PATH);
}

/**
 * True when one session-journal entry carries an activation signal.
 *
 * @param {unknown} entry
 * @returns {boolean}
 */
export function entryActivates(entry) {
	if (!entry || typeof entry !== "object") return false;
	if (entry.type === "custom" && entry.customType === "tool_execution_start") {
		return argsActivate(entry.data && entry.data.args);
	}
	if (entry.type === "message") {
		const message = entry.message;
		if (!message || typeof message !== "object" || message.role !== "user") return false;
		return isActivationText(messageText(message.content));
	}
	return false;
}

/**
 * True when any entry in a journal slice carries an activation signal.
 *
 * @param {unknown} entries
 * @returns {boolean}
 */
export function scanEntries(entries) {
	return Array.isArray(entries) && entries.some(entryActivates);
}

/**
 * Read the current branch's journal entries, or an empty array.
 *
 * @param {{ sessionManager?: unknown }} ctx
 * @returns {unknown[]}
 */
function journalEntries(ctx) {
	const manager = ctx?.sessionManager;
	if (!manager || typeof manager.getBranch !== "function") return [];
	const branch = manager.getBranch();
	if (!branch || typeof branch.getEntries !== "function") return [];
	const entries = branch.getEntries();
	return Array.isArray(entries) ? entries : [];
}

/**
 * Draw the line. A status line is cosmetic; it must never end a session.
 *
 * @param {{ ui?: { setStatus?: (key: string, text: string) => void } }} ctx
 */
function draw(ctx) {
	const setStatus = ctx?.ui?.setStatus;
	if (typeof setStatus !== "function") return;
	setStatus(STATUS_KEY, STATUS_TEXT);
}

/**
 * omp extension entry point.
 *
 * `session_start` catches resumed sessions whose journal already holds the
 * activation. `before_agent_start` catches the dispatch turn itself.
 * `tool_execution_start` catches a model-initiated `read` of the skill.
 * `turn_end` rescans, because the tool event does not reliably reach a
 * draw-capable context mid-turn.
 *
 * Lane routing registers alongside the status line; each keeps its own state.
 *
 * @param {{ on: (event: string, handler: (event: unknown, ctx: unknown) => unknown) => void }} pi
 */
export default function pstack(pi) {
	/** One-way latch. Activation has no off switch. */
	let active = false;

	/** Run `body`, swallow anything it throws. */
	const guard = (body) => {
		try {
			body();
		} catch {
			// A cosmetic surface never gets to take the session down.
		}
	};

	pi.on("session_start", (_event, ctx) => {
		guard(() => {
			if (!active) active = scanEntries(journalEntries(ctx));
			if (active) draw(ctx);
		});
	});

	pi.on("before_agent_start", (event, ctx) => {
		guard(() => {
			const payload = event?.data ?? event;
			if (isActivationText(payload?.prompt)) active = true;
			if (active) draw(ctx);
		});
	});

	pi.on("tool_execution_start", (event, ctx) => {
		guard(() => {
			const payload = event?.data ?? event;
			if (argsActivate(payload?.args)) active = true;
			if (active) draw(ctx);
		});
	});

	pi.on("turn_end", (_event, ctx) => {
		guard(() => {
			if (!active) active = scanEntries(journalEntries(ctx));
			if (active) draw(ctx);
		});
	});

	registerLaneRouting(pi);
}
