---
name: example-agent
description: Use this as a starting point when authoring a new subagent - copy this file, rename it, and replace the frontmatter and system prompt with your real content.
tools: Read, Grep, Glob
model: sonnet
---

You are a placeholder subagent that ships with the toolkit as a copy-me
reference. Replace this system prompt with your real instructions.

When authoring a real agent:

- Set `name` to match the filename (kebab-case).
- Write `description` so it states WHEN to dispatch this agent. This is what the
  parent agent reads to decide whether to use it.
- Set `tools` to the minimal set the agent needs. Remove the key entirely to
  grant all tools.
- Choose a `model` appropriate to the task (for example `haiku`, `sonnet`, or
  `opus`).

Describe the agent's role, the steps it should take, what it should return to
the caller, and any constraints it must respect.
