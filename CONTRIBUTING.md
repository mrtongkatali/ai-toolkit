# Contributing to ai-toolkit

House style for adding agents and skills. The goal is coherence: everything here
follows the same few disciplines, so agents compose cleanly and one's output can
feed the next. Read this before adding either - it's the canonical version of the
rules that would otherwise drift across files.

## The disciplines

**One intent per agent.** Each agent does one job - locate, comprehend, critique,
or build - and its `description` says WHEN to dispatch it and steers off the other
agents' lanes. If a new agent's mandate overlaps an existing one, rethink it:
overlap means ambiguous routing, which is the main way a lineup rots.

**Right model for the load.** Match the model to the cognitive work, not habit:
- `haiku` - mechanical retrieval (locating, listing).
- `sonnet` - comprehension and synthesis.
- `opus` (optionally `[1m]` / `effort`) - hard reasoning, judgment, building.

Cheaper is better when it's enough; escalate only where reasoning actually pays.

**Evidence over assumption.** Never present a guess as fact. State something only
when you've verified it; below high confidence, label it an inference. Never
fabricate names, paths, or behavior to fill a gap. A subagent can't ask the user
mid-task, so when something material can't be confirmed, report it back to the
caller as an explicit open item rather than guessing past it.

**Output is a contract.** Every agent and skill ends with a strict, parseable
"What to return" block. Its output is usually another agent's input - shape it for
the next step, not for prose.

**Read-only by capability, not by promise.** An agent that shouldn't mutate gets
no `Edit`/`Write` (and no `Bash` unless it genuinely needs read-only git). Enforce
constraints with the `tools` list, not a sentence - the sandbox is a harder
guarantee than an instruction.

**Challenge, don't rubber-stamp.** Judgment agents validate the task before acting,
lead with a better approach when one exists, and disagree directly. Honesty both
ways: say plainly when the spec is sound; don't manufacture objections to seem
critical.

## Skills

- **Config-agnostic.** Don't bake machine/identity specifics (paths, org names,
  accounts) into a skill. Read them from the environment (e.g. gh config dirs, az
  defaults) so the skill stays portable.
- **Preflight, fail clearly.** Check prerequisites up front (tool installed?
  authenticated? configured?) and stop with the exact command that fixes it -
  never a cryptic mid-run error.
- **Degrade gracefully.** An optional enriching stage that fails must not block
  the core job (e.g. ADO being down still lets a PR review proceed).
- **Gate outward-facing actions.** Anything that writes to the outside world
  (posting a review, pushing) is a separate, explicit, confirmed step - never
  automatic.

## Adding an agent

1. Copy `plugins/ai-toolkit/agents/example-agent.md`; name the file in kebab-case.
2. `name` matches the filename; `description` leads with "Use when/to ..." and
   states what it is NOT for.
3. Minimal `tools`; pick the model tier by load; read-only agents get no write
   tools.
4. Body: role, how it works, and a "What to return" contract. Apply the
   disciplines above that fit.

## Adding a skill

1. Copy `plugins/ai-toolkit/skills/example-skill/`; `name` matches the directory.
2. `description` leads with the trigger ("Use when ...").
3. Preflight + config-agnostic + graceful degradation + gated writes, per above.

## Publishing

Bump `version` in both `plugins/ai-toolkit/.claude-plugin/plugin.json` and the
matching `.claude-plugin/marketplace.json` entry (keep them equal), commit, push,
then re-sync the marketplace.
