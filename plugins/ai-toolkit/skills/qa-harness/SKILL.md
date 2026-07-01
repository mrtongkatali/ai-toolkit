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

## Runtime scaffold (one-time, shareable)

The skill drives a small Playwright project shipped in this skill's `scaffold/`.
Set it up once - this is the unit you hand a teammate:

    cp -r <this-skill-dir>/scaffold ~/qa-harness && cd ~/qa-harness
    npm install
    cp .env.example .env        # then fill in IMPACT_WEB_PATH + creds

`.env` holds machine-specific + secret values. Shared defaults (`CLIENT_ID=33517`,
`ENVIRONMENT=dev`) and the base URLs live in the committed config, overridable.

## Preflight (fail clearly, exact fix for each)

1. **Node >= 24.11.0** - `node -v`; if lower, stop: "Node 24.11.0+ required."
2. **Playwright installed** - `npx playwright --version` in the scaffold dir.
3. **IMPACT_WEB_PATH set and exists** - the local clone, for grounding (analysis only).
4. **Creds present** - `QA_USER` / `QA_PASS` in env (from `.env`); never hardcode, never echo.
5. **Target reachable** - the selected env's base URL responds.

## How to work

1. **Pull the AC** - `ado-explorer` on the ticket -> acceptance criteria. No clear
   AC -> stop and say so; there is nothing to verify.
2. **Ground in the repo** (analysis only, via `code-explorer` over `IMPACT_WEB_PATH`):
   - the login form's `data-qaid` hooks (plain username/password, no MFA),
   - the `data-qaid` hooks on the pages the AC touches,
   - any Codeception test that already exercises this area, for flow and test data.
   Use the real `data-qaid` values you find. Where one is missing, flag it - do
   NOT invent a selector.
3. **Derive test cases from the AC and confirm with the caller** before writing -
   one scenario per AC. Cheap way to catch a misread AC early.
4. **Write throwaway Playwright specs** in the scaffold's `tests/`:
   - Log in with creds from `process.env` using the grounded selectors.
   - Select the tenant by navigating to `${baseURL}/admin/${CLIENT_ID}` (skip the
     client-picker UI).
   - One test per AC; assert via `getByTestId(...)` (mapped to `data-qaid`).
5. **Run + self-heal (bounded)** - `npx playwright test --project=$ENVIRONMENT`:
   - Fix TEST defects (wrong selector, timing/wait, setup) and retry, up to ~3 times.
   - A genuine AC failure is the RESULT - report it. NEVER weaken or skip an
     assertion to force green. **Self-heal fixes the test, never the verdict.**
   - Run `--project=staging` too if a multi-env gate was requested.
6. **Report** (see Output).
7. **Discard** - tests are throwaway; clean up the generated specs.

## Output (the report)

One markdown table per environment run:

| Test case | Scenario | Description | Status |
|-----------|----------|-------------|--------|
| AB#947-1  | ...      | ...         | Pass / Fail / Blocked |

- One row per AC. `Blocked` = couldn't run (e.g. missing selector, env down).
- For each failure, include the Playwright **screenshot / trace path**
  (under `test-results/`) so the cause is visible.
- State the honest caveats: a Pass means the generated test passed, not that the
  AC is proven; call out any `data-qaid` gaps, assumptions, or data side-effects.

## Safety

- Runs against the LIVE app - prefer non-destructive scenarios, use the test
  account, and treat anything that writes or deletes data as needing a confirm.
- Secrets come from env only; never write creds into a spec or echo them back.
