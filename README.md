# ai-toolkit

Leo's personal AI toolkit, packaged as a Claude Code plugin marketplace. It
holds reusable skills and agents that can be installed into Claude Code or
Claude Desktop.

## Layout

```
ai-toolkit/                          # this repo = the marketplace
├── .claude-plugin/
│   └── marketplace.json             # catalog - lists the plugin(s)
├── plugins/
│   └── ai-toolkit/                  # the plugin
│       ├── .claude-plugin/
│       │   └── plugin.json          # plugin manifest
│       ├── skills/
│       │   └── example-skill/
│       │       └── SKILL.md
│       └── agents/
│           └── example-agent.md
├── docs/                            # design specs
├── README.md
└── LICENSE
```

The repo is a marketplace hub: the catalog lives at the root and each plugin
lives under `plugins/`. To add another plugin later, create a new subdirectory
under `plugins/` and add an entry to `marketplace.json`.

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
