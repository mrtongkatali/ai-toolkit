---
name: pr-review
description: Use when the user asks to review a GitHub pull request (e.g. "review PR 123", "review this PR"). Fetches the PR via gh, dispatches the code-reviewer-agent, and returns a tabular gist of findings with line permalinks and drafted review comments. Read-only - it drafts comments and saves them, but does not post anything.
---

# pr-review

Review a GitHub pull request and return a concise, tabular gist of findings plus
drafted review comments - without posting anything. Posting is a separate,
explicit step (not yet implemented; see "Posting, later").

This skill is glue: it handles GitHub I/O and account selection, and delegates
the actual judgment to the `ai-toolkit:code-reviewer-agent`. It does not
re-implement review logic.

## Prerequisites (one-time, per account)

Two GitHub accounts on github.com are kept in isolated gh config directories so
neither global state nor tokens get tangled. Authenticate each ONCE - you do not
re-authenticate per review:

    GH_CONFIG_DIR="$HOME/.config/gh-personal" gh auth login
    GH_CONFIG_DIR="$HOME/.config/gh-nbs"      gh auth login

The skill derives the directory from the account name: `gh-<account>`. Read-only
review needs only read scope; posting (later) will need PR-write scope.

## Account resolution

Every gh call must run under the right account's config dir:

    GH_CONFIG_DIR="$HOME/.config/gh-<account>"

- The caller names the account - whatever names you authenticated dirs for
  (e.g. `personal` or `nbs`).
- If the account is not specified, ASK - do not guess. Picking the wrong account
  is exactly the kind of silent wrong assumption to avoid.

## Procedure

1. **Resolve account** -> set `GH_CONFIG_DIR` as above. If unknown, ask first.
2. **Fetch the PR** (read-only), prefixing every gh call with the config dir:
   - `gh pr view <pr> --json number,title,author,url,headRefOid,headRepository,headRepositoryOwner,files`
   - `gh pr diff <pr>`

   `<pr>` may be a number (uses the current repo) or a full PR URL.
3. **Make the code locally available** so the reviewer can trace blast radius,
   not just the diff: use the existing clone, or `gh pr checkout <pr>` (local and
   reversible). If the code cannot be made available, continue but expect the
   reviewer to flag limited blast-radius coverage.
4. **Delegate the review** - dispatch `ai-toolkit:code-reviewer-agent` with a
   self-contained prompt containing: the PR intent/title, the diff, and the local
   repo path to grep for blast radius. Let it return its standard contract
   (Verdict, Findings by severity, Blast radius, Unconfirmed).
5. **Assemble the gist** from the agent's findings (see Output).
6. **Save the draft** for later posting (see Draft artifact). Do not post.
7. **Return the gist**, and tell the caller they can refine the draft, then ask
   to post it later.

## Output (the gist)

Lead with the verdict, then a findings table:

| Sev | Location | Issue & drafted comment | Link |
|-----|----------|-------------------------|------|

- **Sev**: Blocker / Major / Minor / Nit (from the reviewer).
- **Location**: `path:line`.
- **Issue & drafted comment**: the finding, plus the comment text you would post
  on the author's behalf.
- **Link**: a line permalink, built as
  `https://github.com/<owner>/<repo>/blob/<headRefOid>/<path>#L<line>` using the
  values from `gh pr view`.

Below the table, include the reviewer's **Blast radius** and **Unconfirmed**
sections verbatim - those are review signal, not noise.

## Draft artifact

Save the drafted comments so a future posting step can transmit exactly what was
approved (no LLM re-review between approve and post). Write JSON to:

    $HOME/.cache/ai-toolkit/pr-review/<account>-pr<number>.json

with shape:

    {
      "account": "nbs",
      "repo": "owner/name",
      "pr": 123,
      "headSha": "<headRefOid>",
      "verdict": "Needs work",
      "comments": [
        { "path": "src/auth.ts", "line": 42, "severity": "Blocker", "body": "..." }
      ]
    }

The caller may edit this file before posting. The future posting step must read
this file and post it verbatim.

## Evidence over assumption

- If the PR cannot be found, or the account is ambiguous, ask - do not guess.
- Drafted comments must be grounded in the reviewer's findings; do not invent
  issues or fabricate line numbers.

## Posting, later (not implemented)

A future `post` step will read the draft artifact and post under the same
account (write scope required), either as one top-level PR review
(`gh pr review`) or as line-anchored comments via `gh api` keyed on the
`path` / `line` / `headSha` in the draft. This skill intentionally stops at the
draft.
