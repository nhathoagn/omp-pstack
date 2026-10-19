/**
 * pstack extension unit test. Run: node scripts/test-extension.mjs
 *
 * Covers the two extension responsibilities end to end against a fake `pi`:
 * the status-line latch and lane routing. Nothing here touches a network or a
 * model; the extension is pure event handling.
 */
import assert from "node:assert/strict";
import { registerLaneRouting } from "../plugins/pstack/extension/lanes.js";
import pstack, { STATUS_KEY, STATUS_TEXT } from "../plugins/pstack/extension/index.js";

/** A fake `pi` that records handlers and replays events. */
function fakePi() {
	const handlers = new Map();
	return {
		handlers,
		on(event, handler) {
			const list = handlers.get(event) ?? [];
			list.push(handler);
			handlers.set(event, list);
		},
		async emit(event, payload, ctx) {
			const results = [];
			for (const handler of handlers.get(event) ?? []) {
				results.push(await handler({ type: event, ...payload }, ctx));
			}
			return results.at(-1);
		},
	};
}

function statusRecorder() {
	const statuses = [];
	return { statuses, ctx: { ui: { setStatus: (key, text) => statuses.push([key, text]) } } };
}

// ---------------------------------------------------------------------------
// Status line
// ---------------------------------------------------------------------------

{
	const pi = fakePi();
	pstack(pi);
	const { statuses, ctx } = statusRecorder();
	assert.equal(statuses.length, 0, "idle session must not draw");

	await pi.emit("before_agent_start", { prompt: "add saved filters" }, ctx);
	assert.equal(statuses.length, 0, "an ordinary prompt must not draw");

	await pi.emit(
		"before_agent_start",
		{ prompt: '[IMPORTANT: User invoked the "poteto-mode" skill; follow it] add saved filters' },
		ctx,
	);
	assert.deepEqual(statuses.at(-1), [STATUS_KEY, STATUS_TEXT], "dispatch must draw the line");

	await pi.emit("turn_end", {}, ctx);
	assert.equal(statuses.at(-1)[1], STATUS_TEXT, "the latch survives later turns");
}

{
	const pi = fakePi();
	pstack(pi);
	const { statuses, ctx } = statusRecorder();
	await pi.emit("tool_execution_start", { toolName: "read", args: { path: "skill://poteto-mode" } }, ctx);
	assert.equal(statuses.at(-1)?.[1], STATUS_TEXT, "reading the skill body must draw the line");
}

{
	const pi = fakePi();
	pstack(pi);
	const { statuses, ctx } = statusRecorder();
	const branch = {
		getEntries: () => [
			{
				type: "message",
				message: {
					role: "user",
					content: [{ type: "text", text: '[IMPORTANT: User invoked the "poteto-mode" skill;  x]' }],
				},
			},
		],
	};
	await pi.emit("session_start", {}, { ...ctx, sessionManager: { getBranch: () => branch } });
	assert.equal(statuses.at(-1)?.[1], STATUS_TEXT, "a resumed session must restore the line");
}

{
	const pi = fakePi();
	pstack(pi);
	const ctx = { ui: { setStatus: () => { throw new Error("no surface"); } } };
	await pi.emit("before_agent_start", { prompt: '[IMPORTANT: User invoked the "poteto-mode" skill]' }, ctx);
	assert.ok(true, "a throwing status surface must not escape the handler");
}

// ---------------------------------------------------------------------------
// Lane routing
// ---------------------------------------------------------------------------

/** Drive one task call and its spawns through a fresh router. */
async function routeCall(pi, args, spawns) {
	await pi.emit("tool_call", { toolName: "task", toolCallId: "tc_1", input: args });
	return Promise.all(spawns.map(spawn => pi.emit("before_subagent_spawn", spawn)));
}

{
	const pi = fakePi();
	registerLaneRouting(pi);
	const [single] = await routeCall(
		pi,
		{ agent: "designer", task: "Produce one candidate design package.", solutionSpace: "one design: browser page" },
		[{ agent: "designer", spawnKey: "DesignOne" }],
	);
	assert.equal(single, undefined, "a lone arm keeps its frontmatter lane");
}

{
	const pi = fakePi();
	registerLaneRouting(pi);
	const results = await routeCall(
		pi,
		{
			context: "one design: two candidates",
			tasks: [
				{ name: "A", agent: "designer", task: "candidate A", solutionSpace: "one design: browser page" },
				{ name: "B", agent: "designer", task: "candidate B", solutionSpace: "one design: CLI" },
			],
		},
		[
			{ agent: "designer", spawnKey: "A" },
			{ agent: "designer", spawnKey: "B" },
		],
	);
	assert.deepEqual(results[0]?.model, ["@pstack-review-a"], "arm 1 takes panel lane a");
	assert.deepEqual(results[1]?.model, ["@pstack-review-b"], "arm 2 takes panel lane b");
}

{
	const pi = fakePi();
	registerLaneRouting(pi);
	const results = await routeCall(
		pi,
		{
			context: "adversarial review",
			tasks: [1, 2, 3, 4].map(n => ({
				agent: "code-reviewer",
				task: `reviewer ${n}`,
				solutionSpace: `one review ${n}`,
			})),
		},
		[1, 2, 3, 4].map(n => ({ agent: "code-reviewer", spawnKey: `tc_1:${n}` })),
	);
	assert.deepEqual(
		results.map(r => r?.model?.[0]),
		["@pstack-review-a", "@pstack-review-b", "@pstack-review-c", "@pstack-review-d"],
		"a four-arm panel walks the panel lanes in order",
	);
}

{
	const pi = fakePi();
	registerLaneRouting(pi);
	const tag = "Review the diff. lane: @pstack-security Posture: hostile.";
	const [single] = await routeCall(
		pi,
		{ agent: "code-reviewer", task: tag, solutionSpace: "one review: security" },
		[{ agent: "code-reviewer", spawnKey: "SecReview" }],
	);
	assert.deepEqual(single?.model, ["@pstack-security"], "a tag wins over the panel and the frontmatter");
	assert.match(single?.note ?? "", /tag/, "the note names the reason");
}

{
	const pi = fakePi();
	registerLaneRouting(pi);
	const results = await routeCall(
		pi,
		{
			context: "adversarial review",
			tasks: [
				{ name: "Judgment", agent: "synthesizer", task: "lane: @pstack-judgment weigh the findings" },
				{ name: "Tooling", agent: "synthesizer", task: "lane: @pstack-code-hard audit the tooling" },
			],
		},
		[
			{ agent: "synthesizer", spawnKey: "Tooling" },
			{ agent: "synthesizer", spawnKey: "Judgment" },
		],
	);
	assert.equal(results[0]?.model?.[0], "@pstack-code-hard", "a named spawn matches its own brief");
	assert.equal(results[1]?.model?.[0], "@pstack-judgment", "out-of-order spawns stay on their own lane");
}

{
	const pi = fakePi();
	registerLaneRouting(pi);
	const results = await routeCall(
		pi,
		{
			context: "explain the subsystem",
			tasks: [1, 2].map(n => ({ agent: "explorer", task: `angle ${n}`, solutionSpace: `one trace ${n}` })),
		},
		[1, 2].map(n => ({ agent: "explorer", spawnKey: `tc_1:${n}` })),
	);
	assert.deepEqual(results.map(r => r), [undefined, undefined], "non-panel agents keep one lane across arms");
}

{
	const pi = fakePi();
	registerLaneRouting(pi);
	const [unrecorded] = await routeCall(pi, { agent: "designer" }, [{ agent: "critic", spawnKey: "Orphan" }]);
	assert.equal(unrecorded, undefined, "an unmatched spawn falls through to frontmatter");
}

{
	const pi = fakePi();
	pstack(pi);
	const [routed] = await routeCall(
		pi,
		{
			context: "two candidates",
			tasks: [
				{ agent: "critic", task: "critique A", solutionSpace: "one critique A" },
				{ agent: "critic", task: "critique B", solutionSpace: "one critique B" },
			],
		},
		[{ agent: "critic", spawnKey: "tc_2:0" }],
	);
	assert.deepEqual(routed?.model, ["@pstack-review-a"], "the full entry point routes spawns too");
}

console.log("ok: extension status line + lane routing");
