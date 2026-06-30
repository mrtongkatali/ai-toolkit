---
name: pr-review
description: Use when the user asks to review one or more GitHub pull requests (e.g. "review PR 123", "review PRs 123 and 456", "review this PR") or to post a previously drafted review ("post the review for PR 123"). Review mode runs an independent review via the code-reviewer-agent - one isolated git worktree per PR, so several review in parallel - and returns a tabular gist with drafted comments; post mode posts the approved draft to the PR. Supports multiple GitHub accounts via isolated gh config directories.
---

# pr-review

Review a GitHub pull request, return a tabular gist of findings plus drafted
review comments, then - on a separate, explicit request - post the approved draft
to the PR. Two modes:

- **Review** (read-only): fetch the PR, delegate judgment to
  `ai-toolkit:code-reviewer-agent`, return the gist, and save a draft artifact.
- **Post** (write): read the approved draft and post it to the PR verbatim - no
  re-review.

Several PRs can be reviewed in parallel, each in its own git worktree - see
"Reviewing multiple PRs at once".

The split is deliberate: you inspect (and may edit) the draft before anything is
posted. Posting is never automatic. This skill is glue - it handles GitHub I/O
and account selection; it does not re-implement review logic.

## Prerequisites (one-time, per account)

Two GitHub accounts on github.com are kept in isolated gh config directories so
neither global state nor tokens get tangled. Authenticate each ONCE - you do not
re-authenticate per review:

    GH_CONFIG_DIR="$HOME/.config/gh-personal" gh auth login
    GH_CONFIG_DIR="$HOME/.config/gh-nbs"      gh auth login

The skill derives the directory from the account name: `gh-<account>`. Review
needs only read scope; posting needs PR-write scope (and SSO authorization if the
org requires it).

## Preflight (run before any gh work, both modes)

Verify the environment first and fail with a clear, actionable message - never
proceed into a cryptic error:

1. **gh installed?** `command -v gh`. If absent: stop - "GitHub CLI (gh) is not
   installed."
2. **Account named?** If not specified, ASK (see Account resolution) - never
   guess.
3. **Config dir exists?** `[ -d "$HOME/.config/gh-<account>" ]`. If absent: stop -
   "No gh config dir for <account>; run the one-time auth in Prerequisites."
4. **Authenticated?** `GH_CONFIG_DIR=... gh auth status`. If it fails: stop -
   "Not authenticated for <account>; run gh auth login for that config dir."
5. **(Post mode only) Write scope?** The token must be able to write PR reviews.
   If `gh auth status` shows no write scope, or a post returns 403: stop - "Token
   for <account> lacks PR-write scope; re-run gh auth login with write scope (and
   authorize SSO if required)."

Always report exactly which check failed and the single command that fixes it.

## Account resolution

Every gh call must run under the right account's config dir:

    GH_CONFIG_DIR="$HOME/.config/gh-<account>"

- The caller names the account - whatever names you authenticated dirs for
  (e.g. `personal` or `nbs`).
- If the account is not specified, ASK - do not guess. Picking the wrong account
  is exactly the kind of silent wrong assumption to avoid.

## Mode: Review (read-only)

1. **Preflight** (above).
2. **Resolve account** -> set `GH_CONFIG_DIR`.
3. **Fetch the PR** (read-only), prefixing every gh call with the config dir:
   - `gh pr view <pr> --json number,title,author,url,headRefOid,headRepository,headRepositoryOwner,files,comments,reviews`
   - `gh pr diff <pr>`

   `<pr>` may be a number (uses the current repo) or a full PR URL.

   **Read what's already been said before reviewing.** Pull the existing
   `comments` and `reviews` - including bot reviewers like CodeRabbit, which often
   leaves an auto-summary in the PR body and inline notes. Distill them into a
   short "already raised" digest and pass it to the reviewer in step 5 with the
   instruction to *not* repeat points already made. This keeps the review additive
   (new signal) instead of echoing what the author has already seen, and avoids
   posting duplicate comments.
4. **Get the PR code on disk for blast-radius tracing** - sized to the diff (see
   "Scaling effort to PR size"). The default is an isolated worktree so the
   reviewer never touches your working tree or current branch:
   - `git fetch origin pull/<pr>/head:refs/pr/<pr>` (a named ref, not `FETCH_HEAD`)
   - If a worktree already exists at
     `$HOME/.cache/ai-toolkit/pr-review/wt/<account>-pr<pr>`, reuse it: point it at
     the freshly fetched ref (`git -C <path> checkout -f refs/pr/<pr>`) rather than
     re-running a full `worktree add` checkout. Otherwise
     `git worktree add "$HOME/.cache/ai-toolkit/pr-review/wt/<account>-pr<pr>" refs/pr/<pr>`.

   Remove it when done with `git worktree remove <path>` (read-only review leaves
   nothing to lose). If the repo is not cloned locally, clone it to a temp dir
   first. If the code cannot be made available at all, continue but expect the
   reviewer to flag limited blast-radius coverage.
5. **Delegate the review** - dispatch `ai-toolkit:code-reviewer-agent` with a
   self-contained prompt containing: the PR intent/title, the diff, the worktree
   (or local-clone) path to grep for blast radius, and the "already raised" digest
   from step 3. Let it return its standard contract (Verdict, Findings by severity,
   Blast radius, Unconfirmed).
6. **Assemble the gist** from the agent's findings (see Output).
7. **Save the draft** for later posting (see Draft artifact). Do not post.
8. **Return the gist**, and tell the caller they can refine the draft, then ask
   to post it.

## Scaling effort to PR size

The reviewer agent (opus) is the dominant token cost, so match the machinery to
the diff instead of running the same heavy pass on every PR. Triage from the
`files` array and diff size in step 3, then pick a tier:

- **Trivial / small** (roughly 1-3 files, no cross-cutting change - e.g. a single
  migration, a config tweak, a localized bugfix): skip the dedicated worktree.
  Reuse the existing local clone for sibling/context files (they already exist on
  the base branch) and hand the reviewer the diff text plus that clone path. One
  `code-reviewer-agent`, no discovery pre-pass. This is the common case and where
  the savings add up.
- **Medium** (several files, one subsystem): the default - one worktree at the PR
  ref, one `code-reviewer-agent`. No pre-pass.
- **Large / sprawling** (many files or wide blast radius): worktree + an optional
  `code-explorer-agent` pre-pass that maps the blast radius (callers of changed
  symbols, related files) and hands the reviewer precise paths, so the reviewer
  spends its budget judging rather than hunting. Use `code-analyst-agent` only
  when the reviewer needs an unfamiliar subsystem explained before it can judge
  correctly.

Adding discovery agents costs more tokens, so only reach for them on large PRs
where they save the reviewer more search than they cost. For trivial PRs, doing
less is the optimization - don't pre-pass a 26-line migration.

## Reviewing multiple PRs at once (parallel)

Single-PR review is the atom; reviewing several at once just fans out over it,
giving each PR its own worktree so branches never collide and your main working
tree is never touched.

Per PR, run concurrently:

1. **Preflight + resolve account** for that PR's `(account, pr)` pair - a batch
   may mix accounts, so resolve each independently; never assume one account for
   all of them.
2. **Fetch into a named ref** (not `FETCH_HEAD`, which parallel fetches would
   clobber): `git fetch origin pull/<n>/head:refs/pr/<n>`.
3. **Add an isolated worktree** at that ref:
   `git worktree add "$HOME/.cache/ai-toolkit/pr-review/wt/<account>-pr<n>" refs/pr/<n>`.
4. **Dispatch a `ai-toolkit:code-reviewer-agent`** pointed at that worktree path
   (plus the PR's diff).
5. **Save that PR's draft artifact** and collect its gist.

Then:

- **Aggregate** the per-PR gists into one combined report, one section per PR,
  with a separate draft artifact per PR.
- **Clean up** every worktree: `git worktree remove <path>` for each, then
  `git worktree prune`. Remove unconditionally - read-only review leaves nothing
  to lose.

Constraints:

- **Same repo** -> one clone, N worktrees (shared object store). **Different
  repos** -> already isolated; one clone per repo, no worktree needed.
- **Concurrency and cost** -> parallel reviewers are capped (~10-16 at once) and
  cost scales with N (opus per reviewer). Fine for a handful; think before firing
  dozens.
- **Posting stays per-PR and explicit** (Post mode) - one approved draft at a
  time, no batch posting.

## Worktree housekeeping

Review worktrees are normally removed as soon as their review finishes. This pass
garbage-collects any that linger (e.g. from an interrupted review). It is safe to
run any time, and worth running at the start of a multi-PR batch.

For each worktree under `$HOME/.cache/ai-toolkit/pr-review/wt/` named
`<account>-pr<n>`:

1. **Check the PR state**:
   `GH_CONFIG_DIR="$HOME/.config/gh-<account>" gh pr view <n> --json state`
2. **Prune if stale** - when the PR state is `CLOSED` or `MERGED`, or gh can no
   longer resolve the PR (deleted):
   - `git worktree remove --force <path>` (read-only review leaves nothing to
     lose, so force-remove is safe),
   - `git update-ref -d refs/pr/<n>` (drop the named ref).
3. After the pass, run `git worktree prune` to clear stale admin records.

Leave OPEN PRs alone - they may still be under review. A merged/closed PR's
deleted branch is already covered by the state check; for the rare OPEN PR whose
head branch was deleted, confirm against the PR's head repository before pruning -
do not infer from `origin` alone, which misreads fork PRs.

## Mode: Post (write)

Triggered by an explicit request to post a previously drafted review.

1. **Preflight** (above), including the write-scope check.
2. **Load the draft** for the PR from the artifact path. If none exists: stop -
   there is nothing approved to post; run a review first.
3. **Use the account recorded in the draft** - not a freshly guessed one - so you
   post under the same identity that produced the review.
4. **Partition the comments** by whether their `path:line` lies inside the PR
   diff:
   - **In-diff** comments -> posted as inline review comments.
   - **Out-of-diff** comments (typically blast-radius findings in unchanged files)
     -> GitHub cannot anchor these inline. Collect them into a single global PR
     comment instead (step 6b).
5. **Confirm before posting** (outward-facing action): show a one-line summary -
   account, repo, PR, count of inline comments, whether a blast-radius global
   comment will be posted, and the review event - and post only after the caller
   confirms.
6. **Post**, in order:
   a. **The review** via the GitHub reviews API:
      `gh api --method POST repos/<owner>/<repo>/pulls/<pr>/reviews` with `body`
      (the verdict and what you checked), `event` (default `COMMENT`), and a
      `comments` array of `{ path, line, body }` for the in-diff findings. One
      atomic, line-anchored review.
      - Default `event` to `COMMENT`. Do NOT `APPROVE` or `REQUEST_CHANGES` on the
        caller's behalf unless they explicitly ask - those are strong, blocking
        actions.
   b. **The blast-radius comment** (only if there are out-of-diff findings): one
      consolidated, clearly labeled global PR comment
      (`gh pr comment <pr> --body ...`) listing the out-of-diff findings with
      their `path:line`. One comment, not one per finding.

   This is two API calls, so it is NOT atomic: post the review first, then the
   comment. If the comment fails after the review succeeded, report exactly that
   so the caller can retry only the comment.
7. **Record results and prevent double-posting**: capture the review URL (and the
   comment URL, if posted) and mark the draft as posted - add `postedAt`,
   `reviewUrl`, and `blastRadiusCommentUrl`. On a later post request for an
   already-posted draft, stop and report the existing URLs rather than posting
   again.
8. **Return the review URL** (and the blast-radius comment URL, if any).

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

## Comment voice

Anything that gets posted to the PR - the drafted comment bodies, the review
verdict/summary, the blast-radius comment - goes out on your behalf, so it must
read like *you* wrote it: a colleague leaving a quick note, not an AI. Casual,
direct, short.

- Write like you talk; contractions are fine ("this'll double-count", "looks like
  a typo"). One or two sentences beats a paragraph.
- Lead with the issue and the fix. Skip preamble like "Great work, but..." or
  "It's worth noting that...".
- Ask when you're unsure ("is this intentional?") instead of over-hedging.
- Avoid AI tells: no stock transitions ("Additionally", "Furthermore",
  "Moreover"), no "I'd suggest considering", no filler, no em dashes (use "-"),
  and don't turn every comment into a bullet list.
- Stay specific and technically accurate - just say it like a human would.

The draft stores these bodies and the post step sends them verbatim, so the voice
you draft is the voice that ships - get it right at draft time.

## Draft artifact

Save the drafted comments so the post step transmits exactly what was approved
(no LLM re-review between approve and post). Write JSON to:

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

The caller may edit this file before posting. The post step reads it, partitions
in-diff vs out-of-diff comments, and posts verbatim.

## Evidence over assumption

- If the PR cannot be found, or the account is ambiguous, ask - do not guess.
- Drafted comments must be grounded in the reviewer's findings; do not invent
  issues or fabricate line numbers.
- Never post without an explicit request and the pre-post confirmation. Review
  mode must not write to the PR under any circumstances.
