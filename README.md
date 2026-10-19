# pstack (omp port)

i'm [poteto](https://x.com/poteto). i've worked with millions of lines of code at Meta, Netflix, and Cursor. i'm also on the react core team where i help build and maintain react compiler.

there's a growing sense that ai writes too much slop code. i agree. throughput without quality is not a goal i aspire to. if you want to go fast, go deep first.

**pstack is my answer.** these are the same skills i use every day to ship high quality code. pstack helps you write less, but higher quality code.

this repository is **omp-pstack**: lauren's pstack ported to [omp (Oh My Pi)](https://github.com/oh-my-pi). the workflows, playbooks, principles, and agent prompts are hers. the harness vocabulary is omp's. nothing in the port weakens a verification or safety gate. the full translation table and port notes live in [docs/omp.md](./docs/omp.md).

## install

```shell
omp plugin marketplace add nhathoagn/omp-pstack
omp plugin install pstack@omp-pstack
```

from a local checkout:

```shell
omp plugin install ./plugins/pstack --local
```

## hướng dẫn sử dụng

làm một lần sau khi cài, rồi gọi skill. mở **session omp mới** sau khi cài hoặc sau khi đổi lane; session đang mở không thấy plugin vừa cài.

### 1. chọn model cho từng vai

pstack không dùng một model cho mọi việc. mỗi vai (code, review, design, …) là một **lane**. lane chưa cấu hình thì spawn **fail** với `No model selected`, không tự rơi xuống model yếu hơn.

trong một session omp:

```
/skill:setup-pstack
```

skill hỏi model nào đi lane nào, rồi ghi vào `~/.omp/agent/config.yml` (`modelRoles`). chỉ chọn selector mà `omp models` liệt kê được. `*` nghĩa là "dùng model mặc định của mình". `inherit` không phải giá trị lane.

muốn xem đang trỏ đâu:

```shell
omp config get modelRoles
```

### 2. gọi đúng cú pháp

omp **không** có lệnh trần `/poteto-mode` hay `/how`. hai cách đều chạy:

| cách | khi nào |
|---|---|
| `/skill:<tên> <việc>` | mọi skill, kể cả skill không có command |
| `/pstack:<tên> <việc>` | 8 command có sẵn: `poteto-mode`, `how`, `why`, `architect`, `interrogate`, `arena`, `reflect`, `setup-pstack` |

```
/skill:poteto-mode Bug: filterByTag so khớp tag phân biệt hoa thường. src/filters.test.ts đã reproduce. sửa và chạy bun test đến khi xanh.
```

```
/pstack:how luồng hủy run đi qua đâu? có n+1 khi tra từng run không?
```

### 3. việc hàng ngày

cổng mặc định là [`/skill:poteto-mode`](./plugins/pstack/skills/poteto-mode/SKILL.md). nó đọc yêu cầu, chọn **một** playbook, rồi tự gọi skill khác khi bước đó cần. không cần nhớ 23 playbook.

| bạn muốn | gõ |
|---|---|
| làm một việc có rigor (feature, bug, refactor) | `/skill:poteto-mode <mô tả + cách verify>` |
| hỏi một subsystem hoạt động thế nào | `/skill:how <câu hỏi>` |
| hỏi vì sao code thành ra thế | `/skill:why <câu hỏi>` |
| chốt shape trước khi viết code vượt một hàm | `/skill:architect <thay đổi>` |
| vài model cố phá một diff | `/skill:interrogate review diff này` |
| vài phương án song song, rồi lấy phần tốt | `/skill:arena <bài toán>` |
| sau một task dài, ghi lại recipe | `/skill:reflect` |
| đổi model từng vai | `/skill:setup-pstack` |

việc càng cụ thể càng ít vòng thừa. nói rõ file, lệnh verify (`bun test`, `npm test`), và "đừng dừng để hỏi" nếu bạn muốn nó chạy đến hết.

khi poteto-mode đã bật, status line hiện `pstack: poteto-mode`. không có dòng đó thì skill chưa được kích hoạt trong session này.

### 4. chuyện gì xảy ra sau lệnh

`poteto-mode` không nhảy thẳng vào sửa file. tùy playbook nó có thể đọc `how` / `why`, rồi `architect` hoặc `arena` (vài agent song song, mỗi arm một lane), rồi mới giao code cho `poteto-agent`. feature và arena nặng; bug có test fail sẵn thì đi playbook `bug-fix`, ngắn hơn.

lane tới một spawn theo thứ tự: tag `lane: @pstack-x` trong brief, rồi thứ tự panel nếu một batch có nhiều arm (`review-a` … `review-d`), không thì lane khai trong agent. chi tiết ở [docs/omp.md](./docs/omp.md).

### 5. khi lỗi

| thấy | làm |
|---|---|
| `No model selected` | lane trống hoặc selector không spawn được. chạy lại `/skill:setup-pstack`. |
| gõ `/poteto-mode` không ra gì | dùng `/skill:poteto-mode` hoặc `/pstack:poteto-mode`. |
| `omp plugin doctor` crash | lỗi của omp 18.12.1, mọi plugin đều crash. kiểm tra bằng `omp plugin list` và `omp read skill://poteto-mode`. |
| status line không hiện | session mở trước khi cài, hoặc chưa gọi poteto-mode. mở session mới. |

<details>
<summary>the twenty-three playbooks</summary>

| playbook | for |
|---|---|
| [investigation](./plugins/pstack/skills/poteto-mode/playbooks/investigation.md) | a read-only question. how does x work, why was y built this way, are we sure. |
| [bug fix](./plugins/pstack/skills/poteto-mode/playbooks/bug-fix.md) | reproduce a defect, root-cause it, and fix with runtime evidence. |
| [perf](./plugins/pstack/skills/poteto-mode/playbooks/perf-issue.md) | trace a measured slowness and improve it against a baseline. |
| [hillclimb](./plugins/pstack/skills/poteto-mode/playbooks/hillclimb.md) | sustained, scientific improvement of one metric against a target. |
| [runtime forensics](./plugins/pstack/skills/poteto-mode/playbooks/runtime-forensics.md) | diagnose a live symptom (leak, idle-cpu spin, glitch) from instrumentation. |
| [trace forensics](./plugins/pstack/skills/poteto-mode/playbooks/trace-forensics.md) | diagnose a captured profiling artifact (cpuprofile, trace, spindump, heap snapshot). |
| [feature](./plugins/pstack/skills/poteto-mode/playbooks/feature.md) | new or changed behavior, built from a named data shape. |
| [refactoring](./plugins/pstack/skills/poteto-mode/playbooks/refactoring.md) | a behavior-preserving change to structure or shape. |
| [prototype](./plugins/pstack/skills/poteto-mode/playbooks/prototype.md) | a throwaway sketch to settle a design or behavioral decision cheaply. |
| [visual parity](./plugins/pstack/skills/poteto-mode/playbooks/visual-parity.md) | pixel-exact ui equivalence between two implementations. |
| [authoring a skill](./plugins/pstack/skills/poteto-mode/playbooks/authoring-a-skill.md) | writing or editing a SKILL.md. |
| [eval](./plugins/pstack/skills/poteto-mode/playbooks/eval.md) | test how a skill or prompt change affects agent behavior, blinded. |
| [babysit](./plugins/pstack/skills/poteto-mode/playbooks/babysit.md) | drive a pr or a stack to merge-ready: conflicts, review threads, ci. |
| [shipping](./plugins/pstack/skills/poteto-mode/playbooks/shipping.md) | independently verify a green stack, then land the contiguous verified run with graphite merge-when-ready. |
| [autonomous run](./plugins/pstack/skills/poteto-mode/playbooks/autonomous-run.md) | drive a long task to completion without stopping. |
| [orchestrate](./plugins/pstack/skills/poteto-mode/playbooks/orchestrate.md) | a standing project handed to one coordinator chat: multi-day, many stacked prs. |
| [autopilot-full](./plugins/pstack/skills/poteto-mode/playbooks/autopilot-full.md) | run independent prs to merged with one owner per pr and root verification of each merge-ready head. |
| [autopilot-stack](./plugins/pstack/skills/poteto-mode/playbooks/autopilot-stack.md) | build and verify one linear graphite stack for the operator to review and land. |
| [session pickup](./plugins/pstack/skills/poteto-mode/playbooks/session-pickup.md) | resume or take over a prior agent's in-flight work. |
| [pause safely](./plugins/pstack/skills/poteto-mode/playbooks/pause-safely.md) | suspend in-flight work cleanly so it can be resumed later. |
| [multi-phase plan](./plugins/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md) | work that spans phases or stacked PRs. |
| [worktree cleanup](./plugins/pstack/skills/poteto-mode/playbooks/worktree-cleanup.md) | reclaim disk by pruning merged or abandoned worktrees and stale ios simulators, safety-gated. |
| [opening a pr](./plugins/pstack/skills/poteto-mode/playbooks/opening-a-pr.md) | the shared pr mechanics every other playbook ends with. |

</details>

### skills

`poteto-mode` runs most of these for you when a step needs them. the table is for when you want one directly. same rule as above: `/skill:how` or `/pstack:how`, never a bare `/how`.

```
/skill:how do we cancel runs? do we have an n+1 when we look up every run to cancel?
/skill:interrogate review this pr.
```

<details>
<summary>all skills</summary>

| skill | use it when |
|---|---|
| [`/skill:poteto-mode`](./plugins/pstack/skills/poteto-mode/SKILL.md) | default entry point for any non-trivial task. |
| [`/skill:how`](./plugins/pstack/skills/how/SKILL.md) | you want a walkthrough of how a subsystem works. |
| [`/skill:why`](./plugins/pstack/skills/why/SKILL.md) | you want to know why something was built this way. queries each evidence category in parallel over your mounted MCP tools. |
| [`/skill:recall`](./plugins/pstack/skills/recall/SKILL.md) | you're starting or resuming work and want recent context rebuilt from your own session history. |
| [`/skill:blast-radius`](./plugins/pstack/skills/blast-radius/SKILL.md) | you have a small-looking change and want to know what else it could break, proven by running code. |
| [`/skill:architect`](./plugins/pstack/skills/architect/SKILL.md) | you're about to write code that crosses a function boundary and want usage, types, and module shape settled first. |
| [`/skill:arena`](./plugins/pstack/skills/arena/SKILL.md) | you want N parallel attempts at the same thing, then the best parts of each. |
| [`/skill:swarm`](./plugins/pstack/skills/swarm/SKILL.md) | you want N parallel workers across different slices or races, then one aggregated report. |
| [`/skill:interrogate`](./plugins/pstack/skills/interrogate/SKILL.md) | you have a diff and want several different models to try to break it. |
| [`/skill:automate-me`](./plugins/pstack/skills/automate-me/SKILL.md) | you want your own `-mode` skill, drafted from how you've actually worked. |
| [`/skill:make-bot-ui`](./plugins/pstack/skills/make-bot-ui/SKILL.md) | you want a page or dashboard wired to a webhook. the omp port skips the cursor-hosted deployment step. |
| [`/skill:setup-pstack`](./plugins/pstack/skills/setup-pstack/SKILL.md) | you want to pick which models pstack uses per lane. detects your models and writes `modelRoles`. |
| [`/skill:reflect`](./plugins/pstack/skills/reflect/SKILL.md) | a long task landed and you want the recipe captured as a skill edit. |
| [`/skill:teach`](./plugins/pstack/skills/teach/SKILL.md) | you want to actually understand a change or subsystem. |
| [`/skill:tdd`](./plugins/pstack/skills/tdd/SKILL.md) | you're fixing a bug and there's a cheap local test path. write the failing test first. |
| [`/skill:no-comments`](./plugins/pstack/skills/no-comments/SKILL.md) | strip comments before review; spawns Comment Sicko and fixes accepted findings. |
| [`/skill:typescript-best-practices`](./plugins/pstack/skills/typescript-best-practices/SKILL.md) | you're reading or editing typescript. |
| [`/skill:figure-it-out`](./plugins/pstack/skills/figure-it-out/SKILL.md) | no bundled playbook fits. designs a rigorous, auditable playbook for the task. |
| [`/skill:show-me-your-work`](./plugins/pstack/skills/show-me-your-work/SKILL.md) | you want a reviewable decision trail. |
| [`/skill:create-verification-skill`](./plugins/pstack/skills/create-verification-skill/SKILL.md) | your project has no scripted way to prove app behavior. |
| [`/skill:maintain-verification-skill`](./plugins/pstack/skills/maintain-verification-skill/SKILL.md) | your verify skill's feature map has drifted from the app. |
| [`/skill:unslop`](./plugins/pstack/skills/unslop/SKILL.md) | you're cleaning up writing. removes AI tells. |
| [`/skill:bro`](./plugins/pstack/skills/bro/SKILL.md) | you want the last message restated in plain human language. |
| [`/skill:technical-writing`](./plugins/pstack/skills/technical-writing/SKILL.md) | layered doc standard for docs, RFCs, readmes, PR descriptions, commit messages. |
| [`/pstack-omp`](./plugins/pstack/skills/pstack-omp/SKILL.md) | port adapter. live omp mechanics for task, lanes, ask, isolation, session store, status line. |
| [`/omp-mechanics`](./plugins/pstack/skills/omp-mechanics/SKILL.md) | port adapter. per-workflow omp amendments for how, why, reflect, swarm, arena, and friends. |

plus the twenty-one `principle-*` skills, one principle each, indexed inline by `poteto-mode`.

</details>

## the `poteto-agent` and Comment Sicko subagents

pstack ships a subagent that runs the style end to end. spawn it with `agent: "poteto-agent"`; it reads `poteto-mode` in full before doing any work. Comment Sicko is a read-only comment reviewer, usually invoked through [`/skill:no-comments`](./plugins/pstack/skills/no-comments/SKILL.md).

the port adds seven more agents that promote the skills' inline prompt templates to first-class omp agents: `explorer`, `critic`, `code-reviewer`, `lead-judgment`, `designer`, `investigator`, and `synthesizer`. see [docs/omp.md](./docs/omp.md) for the table, lanes, and allowlists.

one harness difference is worth knowing up front. cursor's `Task` took a model per call; omp's `task` does not. each agent here carries its lane in frontmatter, a `lane: @pstack-x` tag in a brief overrides it for that spawn, and arms of a multi-arm panel take the panel lanes in order so a race still runs one model per arm. the plugin extension does that routing. a lane you never configured fails its spawn instead of quietly using another model.

## not shipped here

a few things `poteto-mode` references but does not bundle:

- `/deslop` and its team-kit siblings ship on cursor. here those steps are conditional: run a slop-strip when your install has one, skip it otherwise.
- `/create-skill` is a cursor built-in. here the authoring flow is [`playbooks/authoring-a-skill.md`](./plugins/pstack/skills/poteto-mode/playbooks/authoring-a-skill.md).
- cursor's built-in `/babysit` has no omp counterpart; inside `poteto-mode`, the [babysit playbook](./plugins/pstack/skills/poteto-mode/playbooks/babysit.md) covers pr-status requests.
- cloud task environments and cloud workers have no omp equivalent. subagents are local; `isolated: true` gives a child its own worktree.
- the `benny` automation pack stays upstream. it is not ported.

## make it yours

`poteto-mode` is my style. you may not want exactly that.

type [`/skill:automate-me`](./plugins/pstack/skills/automate-me/SKILL.md). it mines your recent sessions, drafts a `<your-name>-mode` skill from how you've actually worked, and routes through pstack underneath.

models are configurable too. type [`/skill:setup-pstack`](./plugins/pstack/skills/setup-pstack/SKILL.md). it detects the models you have access to and writes the lane mapping into `~/.omp/agent/config.yml`. it never silently substitutes a weaker model for a lane you cannot fill; every missing default is a question, not a downgrade.

## license

MIT. pstack is by [lauren tan](https://x.com/poteto) and lives at [cursor/plugins](https://github.com/cursor/plugins/tree/main/pstack). this port follows the same license; see [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
