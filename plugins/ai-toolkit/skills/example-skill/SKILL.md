---
name: example-skill
description: Use this as a starting point when authoring a new skill - copy this directory, rename it, and replace the frontmatter and body with your real content.
---

# Example Skill

This is a placeholder skill that ships with the toolkit so you have a working
reference to copy. It loads and runs as-is, but does nothing meaningful yet.

## How to use this template

1. Copy the `example-skill/` directory to `skills/<your-skill-name>/`.
2. Rename the directory to your skill's name (kebab-case).
3. Update the `name` in the frontmatter to match the directory name.
4. Rewrite `description` so it clearly states WHEN to use the skill. The
   description is what Claude reads to decide whether the skill applies, so lead
   with the trigger ("Use when ...").
5. Replace this body with the actual instructions.

## What a good skill body contains

- A short overview of what the skill does and its core principle.
- Concrete, ordered steps the agent should follow.
- Any guardrails or anti-patterns to avoid.

Keep it focused: one skill, one clear purpose.
