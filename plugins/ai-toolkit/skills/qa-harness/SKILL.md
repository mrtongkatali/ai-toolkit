---
name: qa-harness
description: Use when asked to QA an Azure DevOps ticket (e.g. "QA AB#947", "QA this ticket") - a pre-QA acceptance gate. Pulls the ticket's acceptance criteria via ado-explorer, grounds selectors/flow in the local Impact Web repo, writes throwaway Playwright tests (Node/TS), runs them against the live dev/staging app, and returns a tabular pass/fail report. Drives the live app but writes no code into the app repo.
---

# qa-harness

Pre-QA acceptance gate. Given an ADO ticket, verify its acceptance criteria (AC)
against the live app (dev, optionally staging) and return a report - so obvious AC
failures are caught before the ticket reaches QA. Generated tests are throwaway.

Glue only: `ado-explorer` supplies the AC, `code-explorer` supplies the real
selectors/flow, Playwright does the driving. The report is a smoke signal, **not**
a replacement for QA.

## Runtime project (one-time, shareable)

The skill drives a small Playwright project shipped in this skill's `playwright/`.
Set it up once - this is the unit you hand a teammate:

    cp -r <this-skill-dir>/playwright ~/qa-harness && cd ~/qa-harness
    npm install
    cp .env.example .env        # then fill in IMPACT_WEB_PATH + creds

`.env` holds machine-specific + secret values. Shared defaults (`CLIENT_ID=33517`,
`ENVIRONMENT=dev`) and the base URLs live in the committed config, overridable.

## Preflight (fail clearly, exact fix for each)

1. **Node >= 24.11.0** - `node -v`; if lower, stop: "Node 24.11.0+ required."
2. **Playwright installed** - `npx playwright --version` in the runtime dir.
3. **IMPACT_WEB_PATH set and exists** - the local clone, for grounding (analysis only).
4. **Creds present** - `QA_USER` / `QA_PASS` in env (from `.env`); never hardcode, never echo.
5. **Target reachable** - the selected env's base URL responds.

## How to work

1. **Pull the AC** - `ado-explorer` on the ticket -> acceptance criteria. No clear
   AC -> stop and say so; there is nothing to verify.
2. **Ground in the repo** (analysis only, via `code-explorer` over `IMPACT_WEB_PATH`):
   - the `data-qaid` hooks on the pages the AC touches,
   - any Codeception test that already exercises this area, for flow and test data,
   - login selectors only if `tests/auth.setup.ts` needs updating (login is handled
     once - see step 4).
   Use the real `data-qaid` values you find. Where one is missing, flag it - do NOT
   invent a selector. **Source-grounding can't tell which feature-flag UI variant
   actually renders on the target env** - so after navigating (step 4), sanity-check
   the real `data-qaid` present on the page against what you grounded, and re-target
   if they differ.
3. **Derive test cases from the AC and confirm with the caller** before writing -
   one scenario per AC. Cheap way to catch a misread AC early.
4. **Write throwaway Playwright specs** in `playwright/tests/` (the runtime dir):
   - **Auth is handled ONCE** by the `setup` project (`tests/auth.setup.ts` logs in
     and saves `storageState`); specs start already authenticated - do NOT log in
     per-test (that throttles the login endpoint).
   - Select the tenant by navigating to `${baseURL}/admin/${CLIENT_ID}` (skip the
     client-picker UI).
   - One test per AC; assert via `getByTestId(...)` (mapped to `data-qaid`).
5. **Run + self-heal (bounded)** - `npx playwright test --project=$ENVIRONMENT`:
   - Fix TEST defects (wrong selector, timing/wait, setup) and retry, up to ~3 times.
   - A genuine AC failure is the RESULT - report it. NEVER weaken or skip an
     assertion to force green. **Self-heal fixes the test, never the verdict.**
   - **Fail fast on shared preconditions:** when several ACs depend on one element
     (e.g. a filter panel), verify it exists ONCE up front; if it's missing, mark
     those ACs Blocked and skip them rather than letting each burn the timeout.
   - Run `--project=staging` too if a multi-env gate was requested.
6. **Report** (see Output).
7. **Discard** - tests are throwaway; clean up the generated specs.

## Output (the report)

**Always write the report to `reports/AB<ticket>.md`** in the runtime dir (create
`reports/` if needed) AND return it inline. One markdown table per environment,
with a header of date / env / scope / result:

| Test case | Scenario | Description | Status |
|-----------|----------|-------------|--------|
| AB#947-1  | ...      | ...         | Pass / Fail / Blocked |

- One row per AC. `Blocked` = couldn't run (e.g. missing selector, env down).
- Link the relevant artifact path (see Artifacts) next to any failing row.
- State the honest caveats: a Pass means the generated test passed, not that the
  AC is proven; call out any `data-qaid` gaps, assumptions, or data side-effects.

## Artifacts

Playwright writes these under the runtime dir (all gitignored):

- **HTML report** - `playwright-report/`; open with `npx playwright show-report`.
  Every test, with embedded screenshots + traces for failures.
- **Failure artifacts** - `test-results/<test>/`: screenshot, `trace.zip`, video,
  captured only on failure. Open a trace with
  `npx playwright show-trace <path/to/trace.zip>`.
- **QA report** - `reports/AB<ticket>.md` (the table above), to hand to QA.

## Making tickets QA-ready (what helps this skill)

The harness grounds from source, which can't see which UI variant actually renders
at runtime - the top source of wrong selectors. Tickets/ACs that include these are
far more reliable to automate:

- **Feature-flag state** - which variant the AC targets (e.g. "new OMEU filter UI"
  / "flag X on"). Prevents the most common mismatch.
- **Entry point** - the route to the feature and how to reach it (login -> tenant
  -> route), so navigation isn't guessed.
- **`data-qaid` on every AC-relevant element** (app convention); list new hooks in
  the ticket. Missing hooks force brittle text/CSS fallbacks (and get flagged).
- **Test data / preconditions** - the test client + expected data (e.g. "client
  33517 has people with @nelnet.net emails"), so assertions are precise.
- **Checkable phrasing + expected values** - "N Total People where N = row count"
  beats "count reflects the list": a pass then verifies correctness, not presence.

## Safety

- Runs against the LIVE app - prefer non-destructive scenarios, use the test
  account, and treat anything that writes or deletes data as needing a confirm.
- Secrets come from env only; never write creds into a spec or echo them back.
