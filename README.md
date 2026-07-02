# ai-toolkit

Leo's personal AI toolkit, packaged as a Claude Code plugin marketplace. It
holds reusable skills and agents that can be installed into Claude Code or
Claude Desktop.

## Layout

```
ai-toolkit/                              # this repo = the marketplace
├── .claude-plugin/
│   └── marketplace.json                 # catalog - lists the plugin(s)
├── plugins/
│   └── ai-toolkit/                      # the plugin
│       ├── .claude-plugin/
│       │   └── plugin.json              # plugin manifest
│       ├── agents/                      # subagent definitions
│       │   ├── example-agent.md
│       │   ├── code-explorer-agent.md
│       │   ├── code-analyst-agent.md
│       │   ├── code-reviewer-agent.md
│       │   └── principal-engineer-agent.md
│       └── skills/
│           ├── example-skill/SKILL.md
│           ├── pr-review/SKILL.md
│           ├── ado-explorer/SKILL.md
│           └── qa-harness/          # SKILL.md + playwright/ runtime scaffold
├── README.md
└── LICENSE
```

The repo is a marketplace hub: the catalog lives at the root and the plugin
lives under `plugins/`. To add another plugin later, create a new subdirectory
under `plugins/` and add an entry to `marketplace.json`.

## Agents

The agents split coding work into four non-overlapping intents (plus a template
to copy). Each agent's `description` is what the dispatcher reads to route to it.

| Agent | Intent | Model |
|-------|--------|-------|
| `code-explorer-agent` | **Locate** - "where is X" / "which files touch Y" | haiku |
| `code-analyst-agent` | **Comprehend** - explain or summarize a codebase, with bounded ASCII diagrams | sonnet |
| `code-reviewer-agent` | **Critique** - adversarial review of a diff plus its blast radius; finds, never fixes | opus |
| `principal-engineer-agent` | **Build / decide** - architecture, implementation, debugging | opus[1m] |
| `example-agent` | Template to copy when authoring a new agent | sonnet |

Two disciplines run through all of them: **evidence over assumption** (state only
what is verified; flag what cannot be confirmed rather than guessing) and clean,
parseable output contracts so one agent's result can feed the next. The three
read-only agents (`code-explorer`, `code-analyst`, `code-reviewer`) hold no write
tools and cannot modify anything.

## Skills

| Skill | Purpose |
|-------|---------|
| `pr-review` | Review one or more GitHub PRs: fetch the diff via `gh`, delegate to `code-reviewer-agent`, return a tabular gist with drafted comments, then - on a separate, explicit step - post the approved draft back to the PR. For nbs PRs, pulls linked Azure DevOps tickets (`AB#`) as intent context via `ado-explorer`. Supports multiple GitHub accounts via isolated `gh` config directories. |
| `ado-explorer` | Pull Azure DevOps work-item context for `AB#<id>` references (via `az boards`) and return a distilled intent summary. Read-only. Used directly, or to feed `pr-review` the ticket intent behind a change. |
| `qa-harness` | Pre-QA acceptance gate: pull a ticket's ACs (`ado-explorer`), ground selectors in the app repo (`code-explorer`), write throwaway Playwright e2e (Node/TS) against live dev/staging, and return a tabular pass/fail report. Ships a `playwright/` runtime scaffold (login-once via `storageState`). Read-mostly - drives the live app, writes no app code. |
| `example-skill` | Template to copy when authoring a new skill. |

## Install

In Claude Code or Claude Desktop:

```
/plugin marketplace add mrtongkatali/ai-toolkit
/plugin install ai-toolkit@ai-toolkit
```

The first command registers this marketplace; the second installs the plugin
(`<plugin-name>@<marketplace-name>`).

## Add a skill

1. Copy `plugins/ai-toolkit/skills/example-skill/` to a new directory named for
   your skill.
2. Update `name` and `description` in the `SKILL.md` frontmatter.
3. Replace the body with your instructions.

## Add an agent

1. Copy `plugins/ai-toolkit/agents/example-agent.md` to a new file named for
   your agent.
2. Update the frontmatter (`name`, `description`, `tools`, `model`) and the
   system prompt.

## Publish updates

1. Commit your changes.
2. Bump `version` in both `plugins/ai-toolkit/.claude-plugin/plugin.json` and
   the matching entry in `.claude-plugin/marketplace.json`.
3. Push, then re-sync the marketplace in Claude (`/plugin marketplace update`).

## License

MIT. See [LICENSE](LICENSE).
