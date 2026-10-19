/**
 * pstack lane routing for omp.
 *
 * omp's `task` tool takes no `model` argument for ordinary agents (only the
 * bundled `seance` agent accepts one), so a spawned role cannot name its lane
 * on the call. Lanes ride on `before_subagent_spawn` instead, resolved in this
 * order:
 *
 *   1. `lane: @pstack-<lane>` in the spawn's own brief. Explicit intent wins.
 *   2. A panel arm. When one batch spawns two or more arms of the same panel
 *      agent, each arm takes the next panel lane by position, so a race still
 *      runs one model per arm instead of collapsing onto one.
 *   3. No override. The agent's frontmatter `model: "@pstack-<lane>"` stands.
 *
 * Every entry point is total. A lookup that fails leaves the spawn on its
 * frontmatter lane; it never drops the spawn and never throws.
 */

/** Tag the parent writes in a spawn brief to name a lane outright. */
export const LANE_TAG_PATTERN = /\blane:\s*(@pstack-[a-z0-9-]+)/i;

/** Lanes a multi-arm panel assigns by position. */
export const PANEL_LANES = Object.freeze([
	"@pstack-review-a",
	"@pstack-review-b",
	"@pstack-review-c",
	"@pstack-review-d",
]);

/** Agents that serve races and comparisons rather than single deliverables. */
export const PANEL_AGENTS = Object.freeze(["critic", "code-reviewer", "designer"]);

/** Batches older than this are forgotten. A settled tool call cannot spawn. */
const BATCH_TTL_MS = 10 * 60 * 1000;

/** Concurrent task calls kept for matching. Routing only needs the live one. */
const MAX_BATCHES = 4;

/**
 * The lane a brief names outright.
 *
 * @param {unknown} text
 * @returns {string | undefined} lowercased lane, or undefined
 */
export function laneFromTag(text) {
	if (typeof text !== "string") return undefined;
	const match = LANE_TAG_PATTERN.exec(text);
	return match ? match[1].toLowerCase() : undefined;
}

/**
 * The spawn requests inside one `task` call's arguments.
 *
 * A batch call carries `tasks[]`; a single call carries `agent`/`task` at the
 * top level. A call-level `context` tag is honored only for a one-arm call, so
 * one arm's tag cannot leak onto its siblings.
 *
 * @param {unknown} args
 * @param {string} [defaultAgent]
 * @returns {{ agent: string; name: string | undefined; lane: string | undefined }[]}
 */
export function laneItems(args, defaultAgent = "task") {
	if (!args || typeof args !== "object") return [];
	const calls = Array.isArray(args.tasks) ? args.tasks : args.task !== undefined ? [args] : [];
	const contextLane = calls.length === 1 ? laneFromTag(args.context) : undefined;
	const items = [];
	for (const call of calls) {
		if (!call || typeof call !== "object") continue;
		const agent = typeof call.agent === "string" && call.agent.trim() ? call.agent.trim() : defaultAgent;
		const name = typeof call.name === "string" && call.name.trim() ? call.name.trim() : undefined;
		items.push({ agent, name, lane: laneFromTag(call.task) ?? contextLane });
	}
	return items;
}

/**
 * The lane one arm takes by position among its same-agent siblings.
 *
 * A lone spawn keeps the agent's own lane. Two or more arms of a panel agent
 * spread across the panel lanes in order.
 *
 * @param {{ agent: string }[]} items
 * @param {number} index
 * @returns {string | undefined}
 */
export function panelLaneOf(items, index) {
	const item = items[index];
	if (!item || !PANEL_AGENTS.includes(item.agent)) return undefined;
	const siblings = items.filter(candidate => candidate.agent === item.agent);
	if (siblings.length < 2) return undefined;
	return PANEL_LANES[siblings.indexOf(item) % PANEL_LANES.length];
}

/**
 * Track live `task` calls so spawns can be matched back to their brief.
 *
 * Matching is by name when the parent named the spawn, else by arrival order
 * within the batch. Each arm is claimed once, so a five-arm race walks the
 * panel lanes and wraps.
 *
 * @param {() => number} [now]
 */
export function createLaneRouter(now = () => Date.now()) {
	/** @type {{ id: string; at: number; items: ({ agent: string; name: string | undefined; lane: string | undefined } & { used: boolean })[] }[]} */
	const batches = [];

	function prune() {
		const cutoff = now() - BATCH_TTL_MS;
		while (batches.length > 0 && (batches[0].at < cutoff || batches.length > MAX_BATCHES)) batches.shift();
	}

	return {
		/**
		 * Remember the spawn requests one `task` call carries.
		 *
		 * @param {unknown} args
		 * @param {unknown} toolCallId
		 */
		record(args, toolCallId) {
			const items = laneItems(args).map(item => ({ ...item, used: false }));
			if (items.length === 0) return;
			batches.push({ id: String(toolCallId ?? batches.length), at: now(), items });
			prune();
		},

		/**
		 * The lane one spawn should run on, when this extension has an opinion.
		 *
		 * @param {unknown} agent
		 * @param {unknown} spawnKey
		 * @returns {{ lane: string; reason: "tagged" | "panel" } | undefined}
		 */
		route(agent, spawnKey) {
			const name = typeof spawnKey === "string" ? spawnKey.trim().toLowerCase() : undefined;
			for (const batch of batches) {
				const owned = [];
				for (let index = 0; index < batch.items.length; index += 1) {
					const item = batch.items[index];
					if (!item.used && item.agent === agent) owned.push({ item, index });
				}
				if (owned.length === 0) continue;
				const named = name ? owned.find(entry => entry.item.name?.toLowerCase() === name) : undefined;
				const chosen = named ?? owned[0];
				chosen.item.used = true;
				const lane = chosen.item.lane ?? panelLaneOf(batch.items, chosen.index);
				return lane ? { lane, reason: chosen.item.lane ? "tagged" : "panel" } : undefined;
			}
			return undefined;
		},

		/** Drop all state. Tests use it between cases. */
		reset() {
			batches.length = 0;
		},

		/** Live batch count. Tests use it. */
		size() {
			return batches.length;
		},
	};
}

/**
 * Rewrite spawn models onto pstack lanes.
 *
 * Capture rides on `tool_call`, which omp awaits at argument-prep time before
 * the tool is scheduled; `tool_execution_start` fires after concurrency
 * scheduling and can land after the first spawn has already resolved.
 *
 * The model replacement is a lane alias, so `resolveConfiguredModelPatterns`
 * expands it against `modelRoles` in the user's config and the spawn keeps its
 * role identity and fallback chain.
 *
 * @param {{ on: (event: string, handler: (event: unknown, ctx: unknown) => unknown) => void }} pi
 * @returns {ReturnType<typeof createLaneRouter>}
 */
export function registerLaneRouting(pi) {
	const router = createLaneRouter();

	pi.on("tool_call", event => {
		try {
			const payload = event?.data ?? event;
			if (payload?.toolName !== "task") return undefined;
			router.record(payload.input ?? payload.args, payload.toolCallId);
		} catch {
			// Routing state is best-effort; frontmatter lanes still apply.
		}
		return undefined;
	});

	pi.on("before_subagent_spawn", event => {
		try {
			const payload = event?.data ?? event;
			const routed = router.route(payload?.agent, payload?.spawnKey);
			if (!routed) return undefined;
			return {
				model: [routed.lane],
				note: `pstack ${routed.reason === "tagged" ? "tag" : "panel"} -> ${routed.lane}`,
			};
		} catch {
			return undefined;
		}
	});

	return router;
}
