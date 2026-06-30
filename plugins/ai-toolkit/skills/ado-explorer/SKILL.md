---
name: ado-explorer
description: Use to pull Azure DevOps work-item context when a prompt or a PR references "AB#<id>" (the Azure Boards link syntax) - e.g. "what's AB#947 about", or an nbs PR whose body contains AB#947. Resolves each AB#<id> via the Azure CLI (az boards) and returns a distilled intent summary (title, type, state, description, acceptance criteria). Read-only. Mainly used to give a reviewer the intent behind a change, alongside - not instead of - code analysis.
---

# ado-explorer

Pull context for Azure DevOps (ADO) work items referenced as `AB#<id>` and return
a distilled summary of what the ticket actually asks for. Read-only - it reads
work items, never modifies them.

A work item is a *claim* about what was wanted - it may be stale, vague, or wrong.
Treat it as intent context to reason against, not as ground truth.

## When it triggers

- **Direct**: a prompt contains `AB#<id>` (e.g. "what's AB#947 about?", "pull
  AB#947"). Resolve that work item.
- **Via a PR**: when working an nbs GitHub PR, scan the PR body/description (and
  commit messages / branch name) for `AB#<id>`. Azure Boards' GitHub integration
  injects these links, so nbs PRs usually carry them. Resolve every one you find.

If no `AB#<id>` is present, this skill does nothing - skip it silently.

## Preflight (fail clearly)

ADO access goes through the Azure CLI's `azure-devops` extension, authenticated
via `az login`, with the org/project set as `az` defaults so callers never pass
them. Check each, and on failure stop with the exact fix:

1. **az installed?** `command -v az`. Else: "Azure CLI (az) is not installed."
2. **azure-devops extension?** `az extension show --name azure-devops`. Else:
   "Run: az extension add --name azure-devops".
3. **Authenticated?** `az account show`. If it fails: "Not logged in - run: az login".
4. **Org/project configured?** `az devops configure --list` must show an
   `organization` (and `project`). Else: "Set defaults: az devops configure
   --defaults organization=https://dev.azure.com/<org> project=<project>".

Never pass org/project per call - read them from the configured defaults. If a
later fetch returns an auth/permission error, surface it plainly rather than
guessing.

## How to work

1. **Extract the IDs**: find every `AB#<id>`, strip the `AB#`, keep the number.
   Dedupe. There may be several - resolve them all.
2. **Fetch each work item** (read-only):
   `az boards work-item show --id <id> --output json`
   (org/project come from the configured defaults).
3. **Distill, do not dump**: pull the fields that convey intent - `System.Title`,
   `System.WorkItemType`, `System.State`, `System.Description`,
   `Microsoft.VSTS.Common.AcceptanceCriteria`, assignee, and parent/related links.
   Strip HTML and keep it short. Do not paste the whole raw work item.
4. **Note gaps**: if a field is empty (e.g. no acceptance criteria) or a fetch
   failed, say so - do not invent intent that is not there.

## What to return

Per work item:

### AB#<id> - <title>  (<type>, <state>)
- **Goal**: 1-2 lines on what it asks for.
- **Acceptance criteria**: distilled, or "none stated".
- **Links**: parent/related `AB#` refs, if any.
- **Gaps**: anything missing or unverified.

Keep it tight - this is context for another step, not a standalone report.

## Using it in a review (intent lens, not a crutch)

When this feeds `pr-review` / `ai-toolkit:code-reviewer-agent`, it ADDS a
dimension; it does not replace adversarial code analysis:

- The reviewer still runs its full correctness / security / edge-case pass
  **independently**. Ticket context must not soften that into "does it match the
  story" - most bugs are things the ticket never mentions, and that adversarial
  pass is the point of review.
- Use the ticket to check intent **both ways**: flag where the code does not meet
  the stated acceptance criteria, where it does something the ticket did not ask
  for (scope creep), and where the ticket looks stale versus the code (so a human
  can reconcile).
- Do not relitigate the requirement itself - that is product's call, not the
  reviewer's. Stay about the code, informed by intent.
