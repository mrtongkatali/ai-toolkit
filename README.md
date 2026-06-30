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
│           └── pr-review/SKILL.md
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
| `principal-engineer-agent` | **Build / decide** - architecture, implementation, debugging | opus |
| `example-agent` | Template to copy when authoring a new agent | sonnet |

Two disciplines run through all of them: **evidence over assumption** (state only
what is verified; flag what cannot be confirmed rather than guessing) and clean,
parseable output contracts so one agent's result can feed the next. The three
read-only agents (`code-explorer`, `code-analyst`, `code-reviewer`) hold no write
tools and cannot modify anything.

## Skills

| Skill | Purpose |
|-------|---------|
| `pr-review` | Review a GitHub pull request: fetch the diff via `gh`, delegate to `code-reviewer-agent`, and return a tabular gist with line permalinks plus drafted review comments. Read-only (posting is a planned follow-up). Supports multiple GitHub accounts via isolated `gh` config directories. |
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
