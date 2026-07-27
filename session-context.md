# Session Context

**Last Updated**: 2026-07-26 (Session Closing. Bridged a documentation gap: this file was last updated after PR #122/#123; PRs #124 (docs fix), #125/#126 (CSP Phase 0/1, Issue #68) landed in intervening sessions without a session-context.md update. This session shipped three more PRs — **PR #128** CSP Phase 2 (`style-src-elem`/`style-src-attr` split, Issue #127), **PR #129** distributed tracing via Sentry (Issue #72), **PR #130** Postgres partitioning Phase 7 rollout verification (Issue #66) — then did a full repo cleanup (58 stale branches/worktrees deleted) and closed out with zero open issues, zero open PRs, and a fully clean `main`-only branch state.)
**Current Branch**: `main`
**Session Status**: Closed. Three PRs merged (squash) this session: **PR #128** (`feat(csp): split style-src into style-src-elem (nonce) + style-src-attr (permissive)`, merge `ebc0347`), **PR #129** (`feat(observability): fix distributed tracing to route through Sentry`, merge `11266ce`), **PR #130** (`docs: confirm Postgres partitioning Phase 7 rollout (Issue #66) is complete`, merge `b319b05`). Issue #127 (opened and closed this session) and Issue #72 (closed via PR #129) are both closed. Also deleted 30 local + 28 remote git branches (cross-referenced against `gh pr list --state all` before deleting anything — squash-merges don't register as ancestors for git's own `--merged` check) and 16 stale `.claude/worktrees/agent-*` worktrees+branches. Only `main` remains, locally and on GitHub. All specs in `specs/` re-verified complete; no other unchecked `tasks.md` items found.

**Post-close follow-up (same day)**: the user asked "what's next on the backlog" after close-out — the honest answer was that "zero open issues" only covered formal GitHub issues, not the longer list of smaller findings that had only ever lived in this file's/`project-context.md`'s running notes (moderation stats bug, query-param audit, repo hygiene, Synology sync, search dropdown bug, Resend verification, etc.). Filed the substantive/actionable ones as real GitHub issues — **#132** (moderation `resolved_today` stat bug), **#133** (NUL-byte/surrogate query-param audit), **#134** (untracked local tooling files), **#135** (Synology Drive sync exclusions), **#136** (search-advanced dropdown bug) — deliberately leaving the vaguer "consider doing X" process items (dedicated E2E env, nightly stress tests, token wiring verification, etc.) as running notes rather than issues. Also confirmed via a read-only Resend API call (`GET /domains`, no email sent) that the long-standing `bgclive.online` domain verification item is genuinely done (`status: verified`, sending enabled) — the user had asked to verify this specifically. `project-context.md`'s Next Priorities list updated to cross-reference each filed issue and correct its own prior claim that only items 12/14 remained open (items 0/6/8 were also still open, just never filed).

## Current State

### Latest Session — PR #128 (CSP Phase 2), PR #129 (Sentry Tracing), PR #130 (Spec 015 Phase 7 Verification)

**Starting point**: picked up from CSP Phase 1 (nonce-based `script-src`, PR #126, prior session) and the standing "zero open issues" bar this repo has maintained since 2026-07-16.

**PR #128 — CSP Phase 2 (Issue #127, opened and closed this session)**: split `style-src` into `style-src-elem` (nonce-restricted) and `style-src-attr` (kept permissive — Radix/Framer Motion/`@tanstack/react-virtual`/`@dnd-kit` set inline `style` *attributes* via JS at runtime, which no nonce/hash source can cover). Two real bugs found and fixed, not just a header flip:
- **sonner@2.0.7's `Toaster` CSS injection bug**: its two-step pattern (empty `<style>` connected to `<head>` first, content filled in afterward) means Chromium's CSP engine validates the element once, at that first empty connection, and never re-validates — no nonce/hash could ever pass. Fixed via a new `patch-package` patch, `frontend/patches/sonner+2.0.7.patch`, reordering the two lines so content is set before the element connects to the document.
- Added a `STYLE_ELEM_HASHES` allowlist in `frontend/src/proxy.ts` for a few other static, JS-injected `<style>` elements with no nonce API (Radix ScrollArea/Select viewports) — hashes derived empirically against a real production build, not guessed from source.

CI on the PR surfaced two more real, pre-existing issues invisible in local testing (only reproduce against the live Vercel preview deployment):
- Vercel's own preview "Toolbar"/Live Feedback widget loads `vercel.live` content that violated `frame-src` and injected an un-nonced inline `<style>`. Fixed by the user disabling it via `VERCEL_PREVIEW_FEEDBACK_ENABLED=0` in the Vercel dashboard project env vars — not a code change.
- A second `style-src-elem` violation on `/chat` and `/users` specifically (pages with real network calls), traced to React DOM's own client-side `<style precedence>` Resource-insertion path — same empty-then-filled pattern as the sonner bug, but internal to React. Fixed by adding the well-known SHA-256 hash of the empty string to the allowlist; verified against a live Vercel preview that the real CSS ends up applied correctly afterward, not silently broken.

**PR #129 — Distributed tracing (Issue #72, sourced from Spec 007 task T008)**: T008 was checked off in `specs/007-production-readiness-secops/tasks.md` but didn't match reality — backend had a disconnected OpenTelemetry `TracerProvider`/`OTLPSpanExporter` gated behind an `ENABLE_OTEL` env var that's never set, pointed at an unreachable default `localhost:4317`; frontend had zero `@opentelemetry/*` packages. User chose to route tracing through Sentry (already fully configured both sides) instead of standing up new infra, since Sentry's Python SDK auto-instruments FastAPI/Starlette/SQLAlchemy/Redis natively — confirmed by inspecting `sentry_sdk/integrations/__init__.py`'s `_DEFAULT_INTEGRATIONS` in a scratch venv. Removed the dead OTel code/packages from `backend/app/main.py`/`backend/requirements.txt`. Found and fixed two real gaps between "Sentry is configured" and "traces actually connect":
- Frontend: Sentry JS's default `tracePropagationTargets` only covers same-origin requests, but `frontend/src/services/*.ts` call `NEXT_PUBLIC_API_URL` directly — a different origin (the Railway backend) in every deployed environment. Added the backend origins explicitly in `frontend/src/instrumentation-client.ts`.
- Backend: `CORSMiddleware`'s `allow_headers` in `backend/app/main.py` didn't include `sentry-trace`/`baggage`, so a cross-origin preflight would strip them before the backend ever saw them.

Verified end-to-end, not assumed: sent a crafted `sentry-trace` header with `sampled=1` to a locally-run backend and confirmed Sentry honored that sampling decision instead of its own random 10% sample; used a live Chromium session against a locally-run frontend to confirm outgoing fetch requests to a Railway-backend-matching URL carry `sentry-trace`/`baggage` headers. Also fixed two pre-existing `ruff` BLE001 findings (blind `except Exception:` in `/health`'s DB/Redis checks) with `# noqa: BLE001` plus an explanatory comment — these are intentionally blind, the point of a health check is to catch any failure reason. Added `backend/tests/test_main.py::test_cors_preflight_allows_sentry_trace_headers` and `frontend/tests/unit/instrumentation-client.test.ts`.

**CI failure on PR #129, unrelated to the PR's own content**: `backend-check`/`quality-check` failed with 986 pre-existing lint findings across backend test files nobody had touched. Root-caused to ruff 0.16.0 (unpinned `pip install ruff` in three GitHub Actions workflows) changing its default rule selection between 2026-07-17 (when PR #122 last passed cleanly) and now — confirmed by running ruff 0.15.22 vs 0.16.0 locally against the identical tree. Fixed by pinning `ruff==0.15.22` in `.github/workflows/backend-ci.yml`, `.github/workflows/pr-validation.yml`, and `.github/workflows/deploy-backend.yml` in the same PR (user explicitly approved this as the fix — necessary to unblock the PR, not scope creep).

**Repo cleanup**: deleted 30 local + 28 remote git branches. Verified safety first: cross-referenced every branch name against `gh pr list --state all` — 28 corresponded to already-merged PRs (git's local `--merged` check missed them because squash-merges create a new commit not recognized as a literal ancestor); the remaining 2 (`fix/gallery-async-mock`, `rebase-temp`, identical commits) had no PR but diffing against `main` showed every fix already present verbatim via a later superseding branch. Also removed 16 stale `.claude/worktrees/agent-*` git worktrees + branches from earlier agent tool invocations (all already merged), and a scratch ruff venv from `/tmp`.

**PR #130 — Spec 015 (Postgres partitioning, Issue #66) Phase 7 verification, docs-only**: user asked to check for remaining open issues/specs work. Found `specs/015-postgres-partitioning/tasks.md` Phase 7 (T025–T031, the production rollout steps) all unchecked. Rather than assume, walked through each starting with T025: a read-only `SELECT version_num FROM alembic_version` against production Supabase (explicit user approval obtained first, per this repo's established convention — see the PR #115/#116 session below for precedent) returned `k5l6m7n8o9p0`, the migration chain's actual head, unreachable without T025/T026 already applied. Followed up with more read-only checks (`pg_proc`, `pg_partitioned_table`, per-partition row counts) plus `railway logs`/`railway status --json` — confirmed **all of T025–T031 were already fully complete in production**, just never checked off. Updated the checklist with the evidence for each item; zero code changes.

**Final repo state this session**: 3 PRs merged (#128, #129, #130); issues closed #127 (opened+closed this session), #72 (closed via #129); zero open issues, zero open PRs; only `main` branch anywhere; all CI green on `main`; every `tasks.md` across `specs/` re-verified with no other unchecked items found.

### Bridging note — PRs #124-#126 (undocumented gap in this file)

This file was last updated through PR #122/#123 (2026-07-16). Two intervening sessions were not backfilled into session-context.md before this session started: **PR #124** (`docs: fix stale backend lint command in CLAUDE.md`) and **PR #125**/**PR #126** (CSP Phase 0 — violation-detection E2E coverage + Sentry forwarding; CSP Phase 1 — nonce-based `script-src`, removing `unsafe-inline`/`unsafe-eval`, Issue #68). See `session-summary.md` and `conversation-context.md` for any detail captured on those sessions; this session's own scope began from CSP Phase 1's shipped state and did not re-investigate #124-#126 further.

### Previous Session — PR #119-#122: Frontend `src/lib` Coverage, Deploy Frontend CI Fix, Backend Verification/Moderation API Coverage

**Starting point**: this session began by confirming PR #118 (docs correction, already merged) was green, then investigating frontend `src/lib` test coverage at the user's request. `auth.ts`, `offline-storage.ts`, `performance.ts`, and `prisma.ts` all had 0% coverage; `utils.ts` and `validations/profile.ts` were already fully covered incidentally via component tests.

**PR #119** — `test: add coverage for lib/auth, lib/performance, lib/offline-storage` (branch `test/lib-coverage-auth-performance-offline-storage`, merged squash `3aa7fe2`, branch deleted). Three staff-engineer subagents (one per file, `auth.ts`/`performance.ts` in parallel, `offline-storage.ts` after) wrote the tests; each was independently re-verified (not trusted on self-report) by re-running the real `npx vitest` command and reading the resulting file. `auth.ts` (8 tests): mocks `next-auth`/`@auth/prisma-adapter`/provider factories as identity functions to capture the real config object and callbacks without touching Prisma/a real DB; locks in that the Credentials provider's `authorize()` is an unimplemented placeholder (always returns `null`) and that the `jwt` callback is pure passthrough. `performance.ts` (28 tests): all 13 exports (`debounce`/`throttle`/`useIntersectionObserver`/`useLazyLoad`/`usePrefersReducedMotion`/`useVirtualList`/`preloadResource`/`preconnect`/`requestIdleCallback`/`cancelIdleCallback`/`useDeferredValue`), using `vi.useFakeTimers()` and hand-built `IntersectionObserver`/`matchMedia` mocks. `offline-storage.ts` (13 tests): jsdom has no native `indexedDB`, so a minimal hand-built fake (`vi.stubGlobal`) was needed; found the `if (!this.db) return` guards in `saveFeed`/`getFeed` are dead code (unreachable given how `init()` assigns `db`), documented not fixed. Result: `src/lib` coverage 0%→100% lines/functions on these three files. Caught and fixed two real issues the subagents' own self-reported "done" missed (project-wide `tsc --noEmit`/`eslint` weren't run by them, only isolated per-file checks): a TS2352 unsafe-cast error in `lib-auth.test.ts`, and three `react-hooks/globals` lint violations in `lib-performance.test.ts` (mutating an outer-scope variable during render inside a test probe component — fixed by moving the capture into `useEffect`).

**Also fixed this round, unplanned**: `frontend/node_modules/.bin/vitest` was a broken shim — Synology Drive sync had flattened the npm-created symlink into a real file copy, breaking `vitest.mjs`'s relative `import './dist/cli.js'`. Recreated the symlink + restored the exec bit; unblocks `npx vitest`/`npm run test` for anyone on this machine until the next sync/reinstall re-breaks it (see Local Machine Notes for the recommended fix).

**PR #120** — `test: add coverage for lib/prisma.ts` (branch `test/lib-prisma-coverage`, merged squash `e64108c`, branch deleted). `prisma.ts` was initially deprioritized as "low risk" (thin client singleton) but the user asked for it anyway. All of its logic is import-time side effects (env-var branching between throw/warn on missing `DATABASE_URL`, dev-mode global-instance caching), so the test uses `vi.resetModules()` + dynamic `import()` per scenario. 9 tests, all branches covered; `src/lib` now 100% lines/functions across every file except two documented-intentional gaps in `performance.ts`/`offline-storage.ts` (unreachable defensive branches). This subagent ran the requested project-wide `tsc`/`eslint`/full-suite checks unprompted — clean on first report, independently re-verified anyway (133 files / 1257 tests, no regressions).

**Investigation — `Deploy Frontend` CI failures (led to PR #121)**: the user asked to investigate why `Deploy Frontend` was failing on `main` after PR #119/#120 merged. Root cause: the workflow has two unrelated jobs — `quality-check` (an `npm run build` smoke test using the GitHub Actions secret `NEXT_PUBLIC_API_URL`) and `deploy` (`vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt`, using whatever `NEXT_PUBLIC_API_URL` Vercel's own Production environment resolves to via the CLI). The `deploy` job failed both times with `Error: Invalid rewrite found` (`next.config.ts`'s `/api/:path*` rewrite destination wasn't a valid URL) — most likely because `NEXT_PUBLIC_API_URL` is flagged "Sensitive" in Vercel's dashboard, which excludes it from `vercel pull` when run outside Vercel's own build infrastructure. Critically, **production was never actually affected**: confirmed via the Vercel API that Vercel's native GitHub integration (a completely separate deploy path, `source: "git"` in the deployments API) was auto-building and deploying every push to `main` successfully throughout, aliased live to `www.bgclive.online`/`bgclive.online`. **PR #121** — `fix(ci): remove redundant/broken CLI deploy job from Deploy Frontend` (branch `fix/remove-redundant-deploy-job`, merged squash `36ecb13`, branch deleted) — removed the entire `deploy` job as pure duplicate effort rather than chasing the CLI-specific env var resolution gap. Confirmed via `gh api .../branches/main/protection` that `deploy` was never a required status check (it only runs on push to `main`, never on PRs) and no other workflow references it.

**PR #122** — `test: add endpoint coverage for verification and moderation APIs` (branch `test/verification-moderation-api-coverage`, merged squash `cca5c04`, branch deleted). Closes the last item from the PR #116 session's "Still open" note below: `app/api/verification.py` and `app/api/moderation.py` had only service-layer tests (different, lower-level modules), zero endpoint/route coverage. Two staff-engineer subagents worked in parallel against **isolated local Postgres/Redis Docker containers** (`bgc-test-db` on `localhost:15433`, `bgc-test-redis` on `localhost:16379`) — never the checked-in `.env`, which the existing `pytest_test_db_isolation_landmine` memory correctly warns points at production Supabase. `tests/test_verification_api.py` (19 tests, all 4 routes): found via actual testing (not assumption) that auth (401) is checked before body validation (422) for `POST /{user_id}` — the task brief had assumed the opposite and was corrected by the agent's own experiment. `tests/test_moderation_api.py` (47 tests, all 8 routes): found and documented (not fixed) a likely real logic bug — `GET /stats`'s `resolved_today` filters by `created_at`, not an actual resolution timestamp (no such column exists on `ContentReport`), so a report created yesterday and genuinely resolved today via `POST /resolve` is not counted; `test_resolved_today_counts_by_created_at_not_actual_resolution_time` demonstrates this concretely. Full suite: 662 passed, 1 xfailed, zero regressions; `black`/`ruff` clean (confirmed `ruff check .` — not `flake8` — is this repo's actual CI linter per `backend-ci.yml`; `CLAUDE.md`'s documented `black . && flake8 .` command is stale, `flake8` isn't even in `requirements.txt`).

**Merge-time surprise, resolved not blocking**: PR #122's non-required "Vercel" status context showed `FAILURE` (pointing at Vercel's "why is my account deployment blocked" doc) despite every required/actual CI check passing. Verified via the Vercel API this was NOT an account-wide block — the most recent production deployment (for PR #121's merge) was `READY` and live moments earlier — so this was an isolated, transient preview-build issue for a backend-only PR (which has no frontend changes to preview anyway). Merged on the strength of the required `quality-check` check plus confirmed-healthy production, matching the PR #85-session precedent for merging past non-required failing checks.

**Second Synology Drive sync corruption instance found**: `backend/venv` came out of a fresh `python3.12 -m venv venv` + `pip install` with `pip`'s own vendored `_vendor` directory missing entirely — traced to the same root cause as the earlier `frontend/node_modules/.bin/vitest` symlink flattening (both are rapid-many-small-file-write directories inside the Synology-synced repo folder). Worked around by building the venv in the session's scratchpad directory (outside the synced tree) instead — this is NOT committed anywhere (both `venv/` and the scratchpad path are outside git entirely) and does not persist across sessions; a future session hitting a broken `backend/venv` should suspect this same cause first and either rebuild outside the synced folder or exclude `frontend/node_modules/` + `backend/venv/` (and preventively `frontend/.next/`) from Synology Drive sync at the OS/client level — recommended to the user this session but not actioned (a Synology Drive Client settings change, outside this session's tooling).

**Also discovered, not part of this session's PRs, flagged for a future session**: `tests/test_api_contract.py` (schemathesis-based fuzz/contract tests) bypasses the `db_session` per-test-rollback fixture entirely (calls `app.main.app` directly via `starlette_testclient.TestClient` with no `dependency_overrides` for `get_db`), so its fuzzed mutating requests commit for real against whatever DB it's pointed at. This is currently harmless only because no CI workflow ever runs it combined with other test files in the same `pytest` process (`backend-ci.yml`/`pr-validation.yml` `--ignore` it entirely; `deploy-backend.yml` runs it as a fully separate, later `pytest` invocation) — but it's fragile-by-accident, not fragile-by-design. Also: `schemathesis`/`starlette_testclient` aren't pinned in `requirements.txt` at all despite `deploy-backend.yml` needing them (`pip install pytest ruff httpx schemathesis pytest-alembic` as an inline step) — a latent dependency-pinning gap.

### Previous Session — PR #115 (Messages Partition Restore Fix) + PR #116 (Backend API Endpoint Test Coverage) Merged

**Starting point**: the 2026-07-15 close-out had left two specific items open (see "Previous Session" section below): (1) a prior session couldn't verify via `git log --follow` whether PR #89's commit message was correct that `status_updates`'/`messages`' dropped FK/index issue was "already fixed by an unrelated earlier migration"; (2) whether `backend/scripts/backfill_messages_partitions.py` had been run against production, and the real extent of backend API test coverage, were both unconfirmed.

**Investigation**:
1. Verified PR #89's FK claim by replaying every migration from a clean Postgres 17 container from scratch: the FK/index restoration (`messages_room_id_fkey`, `messages_conversation_id_fkey`, `messages_sender_id_fkey`, `ix_messages_sender_id`) **is** correctly present in git — added by `96be264b314b_add_created_at_to_profile.py` (2025-12-21, the migration immediately after `20251220_partition_messages`), an autogenerated migration nominally about an unrelated column. PR #89's claim was correct in substance; a prior session's `git log --follow` grep simply hadn't found this file because of its misleading name.
2. **But** that same `96be264b314b` migration, as an unreviewed autogenerate side effect, also emitted `op.drop_table("messages_default")` and `op.drop_table("messages_y2025m12")` — alembic's autogenerate doesn't understand native Postgres declarative partitioning and saw those partitions as tables absent from the SQLAlchemy metadata. Confirmed via full local migration replay **and** a direct read-only query against the actual production Supabase Postgres (via the Railway-linked `DATABASE_URL`, run only after explicit user approval, read-only): **`messages` has been a partitioned table with zero partitions attached — not even a default — in every environment since 2025-12-21, including production right now.** Any `INSERT` into `messages` fails outright with "no partition of relation messages found for row." Undetected until now because production has zero real users/messages (`users` table is also empty in production).
3. `status_updates` does **not** have this problem — its own partitioning migration (`j4k5l6m7n8o9`) creates its default/current/next-month partitions inline, so there was no autogenerate gap to clobber it.
4. Cross-referenced all 18 `backend/app/api/*.py` route modules against `backend/tests/*.py` (by both import and URL-prefix grep): 5 modules had zero endpoint-level tests (`block.py`, `forums.py`, `groups.py`, `notifications.py`, `stories.py`). `verification.py` and `moderation.py` have only service-layer tests, not endpoint/route tests — still an open gap, not addressed this session.

**PR #115** — `fix(db): restore messages_default and monthly partitions dropped by 96be264b314b` (branch `fix/66-restore-messages-partitions`, merged squash `3feaa0f`, branch deleted). Adds migration `k5l6m7n8o9p0_restore_messages_partitions.py` creating `messages_default` plus a current/next-month partition for `messages`, mirroring `status_updates`. Validated against a scratch local Postgres 17 container: replayed the full migration chain from scratch (reproduced the zero-partition bug exactly), applied the fix, confirmed both a current-dated insert and an unmatched-date insert now route correctly (to the monthly partition and to `messages_default` respectively), confirmed `alembic downgrade`/re-`upgrade` are clean and idempotent, and confirmed the existing `tests/test_partition_automation.py` suite still passes unchanged. All CI checks green (Backend/Frontend CI, 4x Playwright E2E, Vercel preview, codecov). **Confirmed deployed to production later the same session**: merging to `main` (touching `backend/**`) auto-triggered `Deploy Backend`'s `deploy` job (`railway up`), which completed successfully per GitHub Actions run history; Railway's container restart then ran `alembic upgrade head` via `backend/start.sh`. A follow-up read-only production query confirmed `alembic_version` = `k5l6m7n8o9p0`, with `messages_default`/`messages_y2026m07`/`messages_y2026m08` all present and the FK constraints intact. The initial close-out draft had flagged this as "not yet deployed" purely because it was written before the deploy job had finished — corrected once verified.

**PR #116** — `test: add endpoint coverage for block, forums, groups, notifications, stories` (branch `test/api-block-forums-groups-notifications-stories`, merged squash `62167f5`, branch deleted). Adds `tests/test_block.py`, `tests/test_forums.py`, `tests/test_groups.py`, `tests/test_notifications.py`, `tests/test_stories.py` (53 new tests), following the existing `tests/test_group_chats.py` convention (`_token_for`/`_headers_for`/`_make_*` helpers, one test class per endpoint, direct `db_session` fixture seeding). **Also fixed a real bug found while writing these tests**: `GET /api/forums/tree` crashed with a `MissingGreenlet` SQLAlchemy async error on any request where at least one forum category exists — `ForumCategoryTree.model_validate(cat)` tried to read `cat.children`, a lazy-loaded ORM relationship created by `ForumCategory.parent`'s `backref="children"`, outside an awaited context. The endpoint's own code already rebuilds the tree manually right after this call, so the lazy relationship read was both unnecessary and unsafe. Fixed in `backend/app/api/forums.py` by validating against `ForumCategorySchema` (no `children` field) and constructing `ForumCategoryTree` explicitly with `children=[]`. Undetected until now because the project has never had real forum categories populated (0 rows in production). Verified: all 53 new tests pass, full existing 596-test backend suite unaffected, black/flake8 clean. Needed one `gh pr update-branch` cycle after PR #115 merged first, to get back to a CLEAN merge state before merging #116.

**Process note**: all local verification this session used a throwaway local Postgres 17 + Redis 7 in Docker, not the checked-in `.env` (which points at production Supabase — see the existing MEMORY.md note on this landmine). One read-only query was also run directly against the actual production database, specifically to confirm the zero-partition bug was real in production and not just a fresh-replay artifact — explicit user approval was obtained first, and only read-only queries were executed (no writes).

**Obsidian vault updated this session** (the `obsidian_*` MCP server is connected now, unlike 2026-07-15 when it was not): patched/appended the existing vault notes on Issue #66/DB partitioning and backend API test coverage rather than creating new orphan notes — see the git commit body and this session's chat summary for exact note titles/paths.

**Untracked local tooling files still present, still not committed** (carried forward again, unresolved across three sessions now): `.agents/`, `.claude/skills/`, `backend/.agents/`, `backend/.mcp.json`, `backend/Procfile`, `backend/skills-lock.json`, `skills-lock.json`, plus a modified-but-unstaged `.claude/settings.local.json`. Per standing instruction, these are not auto-committed without asking the user.

**Still open, not addressed this session**:
- `verification.py` and `moderation.py` API routes still lack endpoint-level tests (only service-layer tests exist).
- ~~PR #115's fix has been validated locally/at the code level only — not yet confirmed applied via `alembic upgrade head` against the actual production database~~ — **confirmed deployed 2026-07-16**, see the PR #115 entry above.
- `backend/scripts/backfill_messages_partitions.py` has still never been run against production, but this is moot right now since `messages` has 0 rows there — revisit once real traffic exists.

### Previous Session — PR #113 Merged (Gallery/Groups/Social Test Coverage), Coverage Initiative Complete, Stale Test File Cleanup

1. **Reviewed PR #113** on branch `test/app-gallery-groups-social-coverage`: added unit tests for
   `feed/page.tsx`, `gallery/page.tsx`, gallery albums pages, groups pages, `stories/page.tsx`,
   `topical/[slug]/page.tsx`, and users pages — closing out essentially all remaining `src/app/`
   page-level coverage. This is the last of a 4-PR page-coverage wave that itself follows the
   component/hook/service/store coverage wave documented in the new Bridging Session entry below:
   **#110** (`5e23772`, auth pages + infra routes), **#111** (`3bf6fc6`, chat/forums/media pages),
   **#112** (`b84f460`, admin/settings/profile pages), then **#113**. **#114** (`bf61571`, small tsc
   fixture-typing fix) landed on `main` in between #112 and #113. All of #110-#113's CI checks were
   green (Frontend CI, 4x Playwright E2E shards, Codecov, Vercel preview).
2. **Merged `origin/main` into the branch before merging the PR**: the branch was one commit behind
   `main`, which had picked up PR #114 (`fix: annotate baseUser fixture with AdminUserDetail type`,
   commit `bf61571`) — a standalone fix for a duplicate tsc issue that PR #113's own last commit had
   already fixed independently. The merge was a clean no-op (zero diff), confirming PR #113's own
   description, which had predicted "this diff disappears once #114 merges first." Pushed, waited
   for CI to re-run and pass, then squash-merged via `gh pr merge 113 --squash --delete-branch=false`.
   **Merge commit**: `3a3ef47ba113c4dbf430f091986cd0f7c2dc4bb7`, merged 2026-07-15T23:19:52Z.
3. **Deleted the branch** both locally (`git branch -d`) and on `origin` (`git push origin --delete`)
   after confirming `main` had fast-forwarded past it.
4. **Found and deleted a stale untracked file**: `frontend/tests/unit/forums.test.ts` was present but
   untracked in the working tree. Investigation showed it was byte-for-byte identical to a version an
   earlier session had deliberately deleted in commit `4bb8dde` ("test: add real coverage for all
   src/services/ frontend API clients") — it reimplemented a `buildTree()` function locally instead
   of testing the real `forums.ts` module, providing zero actual coverage. That commit replaced it
   with `forums-service.test.ts` (tests the real module, still exists). Removed with a plain `rm`;
   nothing was staged/unstaged since it was never tracked.

**Coverage initiative status**: with #113 merged, `src/app/` page-level test coverage is essentially
complete for all existing pages. Two gaps are documented as *intentional*, not TODOs, per PR #113's
own description: `feed/page.tsx` (90.9% — virtualizer internals mocked per repo convention, some
guards unreachable because they mirror UI-disabled state) and `topical/[slug]/page.tsx` (82.4% — its
data-fetch is a hardcoded-empty-array stub per its own source comment, pending a real endpoint). A
few trivial dialog `onClose`/defensive-guard branches were also left uncovered intentionally
("don't gold-plate" per the PR description).

**Untracked local tooling files present, not investigated or committed**: `.agents/`,
`.claude/skills/`, `backend/.agents/`, `backend/.mcp.json`, `backend/Procfile` (recreated;
distinct from the identically-named file deleted for the *celery-worker* service in an earlier
session — this instance was not investigated), `backend/skills-lock.json`, `skills-lock.json`.
Also a modified-but-unstaged `.claude/settings.local.json` (grew a few new Bash permission
allowlist entries: `gh pr *`, `gh issue *`, `git log *`, a worktree env-var echo, `Read(//tmp/**)`).
None of these are application code or part of PR #113's scope; none were committed this session.
Per explicit instruction this session, these should not be auto-committed without asking the user —
surfaced here for a future session (or the user directly) to decide: gitignore or commit
intentionally so `git status` stays clean going forward.

**Obsidian vault update — requested but not performed**: the user's standard closing instructions
ask for Obsidian vault updates. No `obsidian_*` MCP tool/server is connected in this environment, so
this could not be done. Flagging explicitly rather than silently skipping — a future session with
the Obsidian MCP server connected should backfill this session's summary into the vault.

### Bridging Session — 2026-07-13/14 (PRs #89-#109): Issue #66 Fully Implemented, 3 Production Bugs Fixed, Backend/Frontend Unit Coverage Initiative

**Backfilled during the 2026-07-15 session close-out** — this entire body of work landed on `main`
without ever being written into these context files; reconstructed from `git log`/`git show` rather
than from a live transcript, so treat file/line specifics as reliable (taken directly from commit
messages and diffs) but treat any framing/rationale not present in a commit message as inferred.

**Issue #66 (DB Partitioning) — actually completed, not paused** (PR #89 `8784fbe`/commit `c7000ec`,
follow-up PR #90 `1b2a025`/commit `c148a52`). **This supersedes every "paused"/"not started"
statement about #66 elsewhere in this file** (see the annotations added at each occurrence below).
- Root cause confirmed and fixed: `messages` was partitioned by `created_at` in December 2025, but
  the automation to create subsequent monthly partitions was never built, so every message since
  January 2026 had been silently landing in a single `messages_default` catch-all.
- Added a generic `create_monthly_partition()` Postgres function (single source of truth, shared
  between the migration and test fixtures via `app/core/partitioning.py`), a weekly Celery Beat task
  keeping both tables' partitions ahead of need, and
  `backend/scripts/backfill_messages_partitions.py` (batched, resumable, run manually/supervised —
  not automatic) to redistribute the mis-routed `messages_default` rows.
- `status_updates` is now partitioned too; its FK situation (`author_id`/`group_id`) turned out to
  already be intact from an unrelated earlier migration, so no separate FK-restore fix was needed
  there (the `messages` FK/index drop from the Dec 2025 migration was investigated separately —
  see note below on whether it was independently addressed).
- Two non-obvious Postgres constraints surfaced during implementation: a DEFAULT partition rejects
  new sibling partitions covering ranges it still holds rows for (required drain-then-create, not
  create-then-drain), and a partitioned table can never have a standalone UNIQUE constraint on a
  non-partition-key column — `post_comments.post_id`'s FK to `status_updates.id` had to be dropped
  entirely rather than worked around, relying on the ORM's existing `cascade="all, delete-orphan"`.
- Also fixed: three `db.get(StatusUpdate, ...)` call sites that break against the new composite PK
  (two known from the original investigation, one introduced by #65's work and only caught by this
  PR's own regression tests), and a test-fixture gap where `Base.metadata.create_all()` alone
  created partitioned parent tables with zero child partitions, silently blocking the whole suite
  once the model changes landed.
- **PR #90 follow-up bug**: writing a real end-to-end test for the new weekly `ensure_future_partitions`
  Celery Beat task surfaced that it reused `app/core/database`'s shared `SessionLocal`/engine
  singleton from inside `run_async()`, which gives each call its own event loop and closes it on
  return — a second call in the same long-lived worker process would fail with "Event loop is
  closed"/"attached to a different loop". Fixed by adding
  `app.core.database.create_scoped_engine()` (a fresh engine+sessionmaker pair, disposed by the
  caller) for this exact from-inside-an-event-loop DB-access pattern.
- New spec: `specs/015-postgres-partitioning/{plan.md,tasks.md}`.

**Three real production bugs found and fixed while writing backend test coverage** (not part of the
original coverage-initiative plan — found incidentally because these modules had 0%/near-0%
coverage and no dedicated test file, so nobody had exercised the actual code paths before):
1. **Chat router was never mounted** (PR #91 `5face22`/commit `0191bb5`): `app/api/chat.py`'s router
   was defined but never registered in `main.py` — every endpoint the frontend calls
   (`chat-window.tsx`, `rooms/page.tsx`, `chat/page.tsx` → `/api/chat/rooms`, `/conversations`,
   `/media`) had been 404ing in production. This is also why the module showed 0% coverage: the
   code was unreachable, not just untested. Fixed with a 2-line `main.py` change; replaced the
   placeholder `test_chat.py` (previously only asserted functions were non-`None`) with 19 real
   tests. `chat.py` coverage: 0% → 91%.
2. **Group chats: always-empty message history + crashing avatar lookups** (PR #94 `99843ba`/commit
   `cd9e94a`): (a) `not GroupMessage.is_deleted` (3 call sites) applies Python `not` to a SQLAlchemy
   column, evaluating to a literal Python `False` at import time; `and_()` compiles that into `WHERE
   false`, so `GET /{group_id}/messages` always returned an empty list and replying to any message
   always 400'd as "not found" — fixed via `GroupMessage.is_deleted.is_(False)`. (b)
   `user.profile.avatar_url` (4 call sites) crashed with `MissingGreenlet` because `.profile` was
   never eagerly loaded (bare attribute access can't implicit-lazy-load under async) — and even
   loaded, `Profile` has no `avatar_url` field; the real avatar is `User.image`. This made sending,
   editing, and listing messages, and viewing group details, 500 as soon as they reached that line.
3. **Android sessions misreported as OS "Linux"** (PR #95 `2e3dfe7`/commit `79d79b9`):
   `session_service.py`'s `parse_user_agent()` OS pattern list checked the bare `"Linux"` pattern
   before `"Android (\d+)"`; real Android browser UAs always include `"Linux;"` in their platform
   tag, so every Android user's "your active sessions" security page showed "Linux" instead of
   "Android". Fixed by checking Android before the generic Linux pattern.

**Coverage-tooling bug found while adding admin.py tests, not just an app bug** (PR #93
`552e22d`/commit `6417b3f`): `coverage.py`'s default trace-function tracer was losing coverage on
any line running after a real `await` suspension later in the same async function — `admin.py`
chains many sequential `await db.execute(...)` calls per endpoint, so it was under-reported at 43%
despite every endpoint being genuinely exercised (verified via real response assertions against
real DB state). Python 3.12's `sys.monitoring`-based tracer core (PEP 669) tracks this correctly;
adding `backend/.coveragerc` with `core = sysmon` took the same test run's measured coverage for
this file to 100% with **no code changes**. Re-running the full suite with this fix showed the
project's real backend coverage is **71%, not the 63% previously reported** — already above
`codecov.yml`'s 60% project target. Applies automatically in CI (coverage.py auto-discovers
`.coveragerc`). **This means any coverage percentage cited in context files from before this PR
(2026-07-14) may understate real coverage for files with sequential awaits.**

**Backend service coverage additions** (each PR added a dedicated test file for a previously
untested/under-tested service, in order): PR #92 `socket_config.py` (43 tests, Socket.io handlers),
PR #96 `totp_service.py` + 2FA API (45 tests), PR #97 `location.py` (11 tests, hardened
`search_users_nearby`), PR #98 `password_reset_service.py` (23 tests), PR #99
`verification_service.py` (22 tests), PR #100 `moderation_service.py` (12 tests), PR #101
`storage.py` (9 tests, Supabase upload/delete), PR #102 `media_processor.py` (59 tests, upload
validation/magic-byte checks/thumbnails/EXIF/ffmpeg probing).

**Frontend unit coverage initiative began** (frontend was at ~5% overall coverage per PR #103's
description): PR #103 `src/services/` (11 API client files; also where the stale
`forums.test.ts` was superseded by `forums-service.test.ts` — see the 2026-07-15 entry above for
the leftover-file cleanup), PR #104 `src/store/` (33 tests, both Zustand stores), PR #105
`src/hooks/` (86 tests across 9 hook files), PR #106 chat/forums/feed/auth components (66 tests),
PR #107 `src/components/ui/` primitives (155 tests, 22 shadcn/Radix components), PR #108
gallery/admin/moderation/pwa/layout components (14 new test files), PR #109
`src/components/profile/` (126 tests across 13 components).

### Previous Session — Warning System (#65, PR #85), Celery Worker Production Incident (PR #86 + #87), DB Partitioning (#66) Investigation Paused

> **[Correction added 2026-07-15]** Everything below in this subsection describes #66 as
> investigated-but-paused, which was accurate when written (2026-07-13) but is **no longer current**:
> #66 was fully implemented the same day in PR #89 + PR #90. See the "Bridging Session — 2026-07-13/14"
> entry above for what actually shipped. Left unedited below for historical accuracy of what was known
> at the time.

#### 1. Issue #65 — Moderation Warning System (planned → implemented → merged, PR #85, merge `583d7e0`, feature commit `1f52f06`)

Full plan-mode cycle (Explore agents + a Plan agent + premium-ux-designer/premium-ui-designer agents
for the UI/UX pass — this was the only one of four open issues with a real UI surface).

- **New `user_warnings` table** (dedicated, not folded into the generic `admin_action_logs` audit
  table) so escalation-count queries stay fast. Configurable threshold
  (`WARNING_ESCALATION_THRESHOLD`, default 3) auto-suspends via the same fields `suspend_user`
  already sets; `WARNING_ESCALATION_SUSPEND_HOURS` (default 168h) controls duration.
- Two issuance paths — report-resolution's previously-stubbed `warn_user` action, and a new direct
  "Issue Warning" action on the admin user detail page — both funnel through one shared
  `warning_service.issue_warning()`.
- **Bug fix riding along**: `resolve_report`'s `warn_user`/`ban_user` had no way to resolve a target
  user for non-`USER` report types (`THREAD`/`POST`/`STATUS`) — added
  `_resolve_report_target_user_id()`.
- Email notification via the existing Resend/Celery pattern (`send_warning_email_task`).
- New frontend: `frontend/src/components/admin/WarningEscalationMeter.tsx` (sm/md/lg,
  amber→orange→destructive ramp, deliberately reusing this app's existing Suspended/Banned status
  colors) and `WarningHistoryList.tsx`. Verified visually in light/dark mode via a temporary
  unauthenticated preview route — created, screenshotted, then deleted before commit, never shipped.
- **Testing**: 22 backend tests in `backend/tests/test_warnings.py` (all passing against an isolated
  Postgres/Redis container pair, never against the real Supabase DB for test runs), Playwright E2E
  additions in `frontend/tests/e2e/admin.spec.ts`, migration upgrade/downgrade verified against a
  throwaway Postgres 17 container before being applied to the real Supabase database (explicit user
  sign-off, since that's a shared-database action).
- Full plan/task breakdown preserved at `specs/014-moderation-warning-system/` (plan.md + tasks.md,
  all 27 tasks marked complete) — this repo's existing spec-kit convention.
- **Merge note**: non-required checks (2 pre-existing flaky Playwright specs unrelated to this work,
  an advisory codecov threshold) were failing at merge time; only the required `quality-check` check
  gates this repo's branch protection, and it passed — merged deliberately with user confirmation
  after confirming the failures were pre-existing/unrelated (later independently reconfirmed: a
  later rerun of the same Playwright shards against `main` passed cleanly).

#### 2. Celery Worker Production Incident (discovered while starting to plan #66, fixed immediately as higher priority — PR #86 merge `6f2ff6e`/commit `5964c28`, PR #87 merge `5bcd5b9`/commit `f8f5c81`)

**Celery has never actually run in production.** While researching #66, investigation surfaced that
only one Railway service (`bgc-replica`, the web process) existed — the `Procfile`'s `worker:` line
was never wired to a deployed service. Confirmed via `LLEN celery` on the Redis broker sitting stuck
at a non-zero, non-draining count, and via `railway logs`/`railway status` showing no worker service.
Every `.delay()`'d Celery task — verification emails, password-reset emails, feed fan-out, and the
new warning emails from #65 — was queuing into Redis and never executing.

- **PR #86** (`fix(deploy): route Celery worker start command via RAILWAY_SERVICE_NAME`): created a
  new `celery-worker` Railway service (user explicitly confirmed each production-infra-touching
  step given this is billed infrastructure — service creation, env var copying, Resend config
  values, `APP_URL`), fixed its Root Directory (a fresh service defaults to the monorepo root and
  fails to build), and added `backend/start.sh`, which branches on Railway's auto-injected
  `RAILWAY_SERVICE_NAME` env var — because a dashboard-set Custom Start Command is silently
  overridden by `railway.json`'s checked-in `startCommand`, which isn't documented anywhere obvious.
  Removed the now-fully-dead `backend/Procfile` (confirmed unused by any CI workflow or local
  tooling) and updated `DEPLOYMENT_GUIDE.md` to match reality.
- **PR #87** (`fix(deploy): remove shared HTTP healthcheck blocking celery-worker deploys`):
  `railway.json`'s `healthcheckPath: /healthz` was being applied to `celery-worker` too even though
  it has no HTTP server, causing every deploy to fail after 11 failed healthcheck retries over 5
  minutes — even though the worker process itself was running correctly and had already processed a
  queued task during that window (confirmed via deploy logs, not just inferred). Removed
  `healthcheckPath`/`healthcheckTimeout` from the shared config entirely (no per-service conditional
  config exists in `railway.json`).
- Also discovered and fixed: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `APP_URL` were never set in
  Railway's production environment at all (only in local `backend/.env`) — set on both services via
  `railway variable set`, piped directly between commands so secret values never appeared in any
  tool output/transcript.
- Fully verified end-to-end post-fix: `celery-worker` deploy status `SUCCESS`, worker logs show
  correct startup banner and full task registry (`fan_out_post`, `send_verification_email_task`,
  `send_password_reset_email_task`, `send_warning_email_task`), and `LLEN celery` confirmed drained
  from 1 to 0.
- **Known unresolved gap, not fixable from the codebase**: Resend reported "the bgclive.online domain
  is not verified" when the worker attempted a real send. **This needs DNS verification in the
  Resend dashboard** — a real open item, not something this session left broken in code.

#### 3. Issue #66 (DB Partitioning) — investigated deeply, implementation deliberately paused **[since completed — see Bridging Session above, PR #89/#90]**

Before the Celery incident took priority, extensive investigation (via a database-optimizer agent
plus direct verification) found:
- `messages` was already partitioned by `created_at` back in December 2025, but the automation to
  create new monthly partitions was never built — every message since January 2026 has been
  silently landing in a single `messages_default` catch-all partition, defeating the whole point.
  This is itself an urgent pre-existing bug independent of whether #66's broader scope proceeds.
- The same December 2025 migration also silently dropped FK constraints
  (`room_id`/`conversation_id`/`sender_id` on `messages`) and an index (`ix_messages_sender_id`)
  that were never restored — a second, independent data-integrity bug found riding along on the
  same migration. **[Update from PR #89's commit message: this was re-investigated during #66's
  implementation and found to already be fixed by an unrelated earlier migration by that point —
  no separate fix was needed in PR #89. This session's own audit of
  `backend/alembic/versions/20251220_partition_messages.py` via `git log --follow` did not find a
  point where these FK/index lines were absent, so the original claim above could not be
  independently re-confirmed either way — flagging the discrepancy rather than asserting either
  version is certainly correct.]**
- `status_updates` was never partitioned at all.
- The app's actual hot-path queries (chat history filtered by `conversation_id`/`room_id`; feed reads
  via Redis fan-out then a Postgres `id IN (...)` fetch) don't filter by date — so partitioning by
  `created_at` won't speed up those queries. Value is in table maintenance/vacuum at scale, analytics
  queries, and future data retention/archival, not per-query latency. User was informed of this
  explicitly and chose to proceed with the full scope anyway (fix the messages bug + partition
  status_updates too) once work resumes.
- A full concrete implementation plan exists (migration sequencing, a generic
  `create_monthly_partition()` PL/pgSQL function, Celery-Beat-based automation recommendation over
  pg_cron, a backfill strategy for the `messages_default` catch-all, model reconciliation for the
  composite `(id, created_at)` PK, two `db.get(StatusUpdate, ...)` call sites in
  `backend/app/api/moderation.py` that would break and need fixing, a rollback runbook, and explicit
  infra-decision flags for the user) — captured in the agent's plan output during this session but
  **not written to a plan file or specs/ directory** since work was paused before reaching that
  point. **This means resuming #66 should re-run the planning/investigation (or at least review this
  session's transcript/summary) rather than assuming a saved artifact exists to pick up from.**

### Bridging Note — PR #84 (env.md Redis doc fix, landed between last doc update and this session)

`docs: update env.md Redis guidance from Upstash to Railway` (merge `89d8464`) — closed the stale
Upstash reference flagged in the 2026-07-12 session below (`env.md` line 95). Docs-only, no code
affected. This is the fix for the "New — fix stale Upstash reference in `env.md`" item that appears
in this file's Next Session Priorities/Notes sections further down.

### Previous Session — Local Dev Environment Repair (Linux workstation, no app code changes)

Purely diagnostic session: get local dev working on a Linux machine after apparent breakage. No
feature work, no bugfix to app code, nothing merged.

1. **False alarm — 114 "deleted" tracked files**: `git status` showed 114 tracked files (frontend
   pages under `frontend/src/app/`, `bgc-personals` components/assets) as unstaged deletions
   (pure `-N/+0` diffs). Root cause: repo is under active Synology Drive sync; once sync finished,
   all 114 files reappeared and `git status` came back clean except for 2 pre-existing
   in-progress files. No git action taken — this was environmental, not a real deletion.
2. **`backend/venv` was a Windows-created venv**, unusable on Linux (`pyvenv.cfg` showed
   `home = C:\Python314`, originally created at `C:\Users\isaiah.muhammad\bgc-replica\backend\venv`
   on the Windows machine used in prior sessions). Deleted and recreated with
   `python3.12 -m venv venv` + `pip install -r requirements.txt` (installed cleanly). No version
   pin exists anywhere in the repo (no `.python-version`/`runtime.txt`/`python_requires`), so 3.12
   was chosen as what's available locally rather than matching the old venv's 3.14.
3. **Stale Redis credentials**: `backend/.env`'s `REDIS_URL` pointed at Upstash
   (`big-jennet-37167.upstash.io`), which no longer resolves via DNS — **the project has migrated
   off Upstash to Railway** for backend + Redis hosting (confirmed with the user; this is a real
   infra fact, not specific to this machine — see note below about `env.md` now being stale).
   Installed the Railway CLI, linked the repo to the existing Railway project
   ("BGCLive Backend", workspace Z3r0fiDeV's Projects, environment production, services
   `bgc-replica` + `Redis`), pulled Redis vars, and updated `backend/.env`'s `REDIS_URL` to the
   **public proxy** address (`redis://default:***@reseau.proxy.rlwy.net:31149`) rather than the
   internal `redis.railway.internal` hostname, which only resolves inside Railway's private
   network. Verified live with `PING`.
4. **`frontend/node_modules/.bin/*` had lost their execute bit** (all 120 bin scripts) — another
   apparent Synology Drive sync side effect stripping POSIX permission bits, causing `next dev` to
   fail with "Permission denied". Fixed with `chmod +x node_modules/.bin/*`.
5. **Stale Turbopack build cache**: after the permission fix, `next dev` still failed —
   `TurbopackInternalError: create symlink to ../../../node_modules/import-in-the-middle ...
   File exists (os error 17)`. Root cause: stale leftover directories under `.next/node_modules/`
   and `.next/dev/node_modules/` conflicting with a symlink Turbopack wanted to create fresh.
   `.next/` is gitignored build output; `rm -rf .next` resolved it.

**Verification**: backend booted via `uvicorn app.main:app`, `/health` returned 200 (live DB
connectivity to Supabase Postgres + Redis connectivity to Railway confirmed); frontend booted via
`npm run dev` (Turbopack), served HTTP 200 on `http://localhost:3000/`. Both dev servers killed
after verification, not left running.

**Nothing committed**: every file touched (`backend/.env`, `backend/venv/`, `frontend/node_modules/`,
`frontend/.next/`) is gitignored/untracked — confirmed via `git ls-files` and `git status`. Only
this doc-close commit lands from this session.

**Stale doc noticed, not fixed this session**: `env.md` line 95 still recommends Upstash for
production Redis (`2. **Production**: Use [Upstash](https://upstash.com) or a managed Redis
instance.`) — inaccurate since the migration to Railway. Worth a follow-up doc fix; out of scope
here since it's not one of the four session-context files and this session was Redis*-consumption*,
not Redis *documentation*.

**Pre-existing "in progress" files turned out to already be merged (discovered mechanically, not by
inspection)**: `frontend/src/app/(protected)/profile/edit/page.tsx` and
`frontend/src/app/(protected)/users/page.tsx` carried real uncommitted local changes (search filter
active-count UI, toast notifications on search success/failure) at the start of this session — per
instructions, their content was not opened or edited. Closing this session required merging
`origin/main` into the doc-close branch to satisfy the strict `required_status_checks` rule (main
had advanced 24 commits since this doc set's last narrative — see Bridging Note below), and that
merge included both files (upstream PRs in the #57-#82 range touched them: +37/-* lines in
`profile/edit/page.tsx`, +218/-* lines in `users/page.tsx`). After the merge, the local uncommitted
diff on both files resolved to **zero remaining difference from `origin/main`** (`git status`
clean, `git diff HEAD` empty) — i.e., the same work was apparently already completed and merged
upstream (likely from the Windows machine used in other sessions), and this Linux checkout's
uncommitted copy was a stale duplicate. No manual edits were made to either file; this was a
mechanical outcome of `git merge`. **A future session should confirm nothing was lost** (spot-check
the search filter active-count UI and toast notifications actually work against current `main`)
rather than assume this reconciliation was 100% correct.

Untracked tooling files also present and not investigated: `.agents/`, `backend/.agents/`,
`backend/.mcp.json`, `backend/skills-lock.json`, `skills-lock.json` (Claude Code / plugin
scaffolding, not gitignored but harmless).

### Bridging Note — PRs #57-#82 (landed between last doc update and this session's PR, not individually detailed here)

This session was diagnostic-only and did not review these changes in depth; listed here so the
"Next Session Priorities" below isn't stale. See `git log --merges 97c8e05..origin/main` for the
full list. Two items are flagged because their titles directly match previously-open priorities
from the PR #55 session — **not independently verified by this session**:
- **`fix(search): resolve dropdown bug where second Select wouldn't open (#57)`** — likely resolves
  the `search-advanced.spec.ts` Ethnicity/Position dropdown bug listed as priority #1 below.
- **`fix(api): add NUL-byte and surrogate validation to query params (#58)`** — likely resolves the
  `chat.py`/`admin.py`/`groups.py`/`moderation.py` audit listed as priority #3 below.
- Other merges in this range: #59 (WebKit/mobile-safari stability), #60 (CodeCov integration), #61
  (recursive SafeBaseModel dict validation), #62 (Sentry Session Replay), #63 (search-advanced E2E
  mocking), #67 (Redis cache-aside for profiles), #69 (GIN/BRIN search indexes), #73 (FRIENDS_ONLY
  gallery privacy fix), gallery thumbnail cleanup, #74-#77 (migration/validation fixes), #78/#70
  (profile completion strength meter), #79/#80 (Railway healthcheck endpoint + timeout), #81 (index
  migration idempotency), #82 (Socket.io WebSocket credentials fix).

**Next session should re-verify priorities #1 and #3 below against current `main` before assuming
they're still open** — this session did not run the E2E suite or audit the query-param fix.

### Earlier Session — E2E CSP, Rate Limits, CORS & Production DB Migration (PR #55)

PR #55 (`b1a9e2e`, branch `fix/e2e-csp-and-rate-limits`) was a large E2E-reliability and
production-hardening session. Merged via standard merge commit (not squash, matching repo
convention) after confirming all required branch-protection checks (`quality-check` × 3) were
green; the Playwright E2E shards are informational-only (not in `required_status_checks.contexts`)
and were still running at merge time — this is expected and does not block merge.

**Fixes shipped, in order:**
1. **CSP blocked Socket.io in production**: `frontend/next.config.ts`'s `connect-src` only
   allowlisted localhost; added `https://*.up.railway.app` / `wss://*.up.railway.app` so the
   Railway-hosted Socket.io backend can be reached over `wss://` from real deployments.
2. **Rate limits tuned for single-user traffic were starving E2E's concurrent workers**: ~13
   `fastapi-limiter` routes across auth.py, profiles.py, gallery.py, media.py, chat.py, forums.py,
   group_chats.py, search.py loosened ~4-6x (e.g. login 5→30/min, register 3/hour→30/hour).
   Admin routes intentionally left untouched.
3. **Cookie-domain bug**: 8 E2E spec files hardcoded `domain: 'localhost'` for the auth cookie,
   which never attaches against a real Vercel preview domain — fixed to resolve the domain from
   `baseURL` (pattern already correct in 2 other spec files).
4. **Backend Socket.io CORS 403 against Vercel previews**: `backend/app/core/socket_config.py`'s
   manual origin check only allowed exact-match origins from a static `CORS_ORIGINS` env var, which
   can never enumerate Vercel's per-deployment preview origins. Added a Vercel-preview regex check
   (`app/core/config.py::is_allowed_origin`), used by both the Socket.io `connect()` handler and
   FastAPI's `CORSMiddleware` (`allow_origin_regex`).
5. **Mobile tab accessibility gap**: `app/(protected)/profile/edit/page.tsx`'s `TabsTrigger` labels
   were wrapped in `<span className="hidden sm:inline">` with no `aria-label` fallback — zero
   accessible name below 640px, breaking every `getByRole('tab', ...)` query in
   `profile-privacy.spec.ts` on mobile viewports. Fixed with explicit `aria-label`.
   - **Correction made mid-session**: this fix (plus a "missing bio field" fix) was initially
     misapplied to `frontend/src/components/profile/edit/ProfileEditForm.tsx`, which turned out to
     be **dead code, never imported anywhere**. The real route is the `page.tsx` above, which
     already had its own 5 tabs and bio field. Reverted the wrong file, reapplied correctly.
     Lesson: verify a component is actually imported/rendered before editing it.
6. **Real production bug found via E2E investigation**: `app/(protected)/forums/[category]/page.tsx`
   read `thread.author_id.slice(0, 8)`, but the backend's `ForumThreadSchema` only returns
   `author: {name, email, image}` — `author_id` does not exist in the contract. Would have crashed
   for every real user. Fixed to render `thread.author?.name`.
7. **2FA code input had no accessible name**: the 2FA `<Input>` in `(auth)/login/page.tsx` had no
   `name`/`aria-label` at all. Added `name="code"` + `aria-label`.
8. **Built the `/share-target` route (spec task T019, previously incomplete)**:
   `frontend/src/app/share-target/route.ts` — parses an OS share-sheet POST, optionally uploads an
   attached file to the gallery, creates a feed post, redirects to `/feed`. The PWA manifest had
   declared this `share_target` action for a long time with nothing behind it.
9. **Assorted E2E test bugs**: promise-ordering races (`waitForResponse` called after the
   triggering click in auth-2fa.spec.ts / profile-privacy.spec.ts), strict-mode substring-collision
   locators (community-forums "Events", gallery-albums "Shared Album", PrivacyToggle aria-label vs
   field-label collisions), a missing wildcard in a gallery-albums mock route, a route handler
   asserting the wrong (auto-fired-on-mount) request in search-advanced.spec.ts, WebKit CORS
   headers added to mocked auth routes.
10. **`next.config.ts` rewrite bug**: `rewrites()` was hardcoded to `http://127.0.0.1:8000`
    unconditionally — correct for local dev, unreachable from Vercel in any deployed environment.
    Fixed to derive from `NEXT_PUBLIC_API_URL`, matching `vercel.json`'s environment-aware rewrite.
11. **CRITICAL — production Supabase DB had never been migrated** (fixed live, user-approved):
    zero application tables existed in the `public` schema backing the Railway backend (confirmed
    via direct `asyncpg` queries through Railway CLI + the backend's own venv). Every DB-touching
    action (registration, login, ...) was silently broken for real users — `/health` only checks
    connectivity, not schema. Ran `alembic upgrade head` directly against production; all 33 tables
    now exist, verified live via curl (`/api/search/` → 200, registration creates a real user,
    test user cleaned up afterward).
12. **Vercel Protection-Bypass platform limitation, conclusively diagnosed**: Vercel's "Protection
    Bypass for Automation" redirect handshake does not re-apply `vercel.json`/`next.config.ts`
    rewrites on the follow-up request (confirmed via direct curl with the user's
    `VERCEL_AUTOMATION_BYPASS_SECRET` — real pages return 200, every rewrite-proxied `/api/*` path
    404s regardless of trailing slash/headers/cookies). Only affects automated/bypass-authenticated
    traffic, never real users. Worked around in the one affected test
    (`search-profile-filters.spec.ts`) by hitting `NEXT_PUBLIC_API_URL` directly.

**E2E health trajectory**: started the session near-total failure (~384 tests, CSP blocking
sockets + 429 rate-limit storms); ended at 60-73 passing per shard out of ~65-76, with 1-2 known
remaining issues (see Next Session Priorities below).

### Bridging Note — PRs #46-#54 (landed between last doc update and this session, not individually detailed here)

The context files had not been updated since PR #45 (`9e6527e`). In the interim, the following
merged to `main` — see `git log --merges 9e6527e..656a523` and the memory file `ci-fixes.md` for
specifics: #46 `fix/e2e-timeout-sharding`, #47 `ci/wire-codecov-sentry-tokens`, #48
`ci/nightly-stress-tests`, #49 `fix/e2e-deployment-targeting`, #52
`fix/community-feed-mock-author-id`, #53 `fix/admin-route-protection`, #54
`fix/pin-fastapi-includedrouter-regression`.

### Previous Session — Deploy Frontend Smoke-Test Confirmation (PR #45)

PR #45 (`9e6527e`, branch `chore/verify-deploy-frontend`) was a deliberate smoke-test change:
added `1440` to `deviceSizes` in `frontend/next.config.ts` to trigger a real frontend build and
deploy. Both the `quality-check` and `deploy` jobs in the Deploy Frontend workflow succeeded
(GitHub Actions run ID 28516698586), confirming the PR #44 Vercel path fix works end-to-end in
production. Branch deleted after merge.

### Latest Merged Work — Deploy Frontend Vercel Path Fix (PR #44)

PR #44 (`7676fa2`) fixed the `Deploy Frontend` workflow. The Vercel CLI steps (`vercel pull`,
`vercel build --prod`, `vercel deploy --prebuilt`) were running with `working-directory: ./frontend`,
which caused Vercel to resolve the source path as `frontend/frontend` (double-nesting against the
dashboard-configured Root Directory = `frontend`). The fix removes those `working-directory:` keys
so the CLI runs from the repo root, where Root Directory = `frontend` resolves correctly.

Two bonus fixes landed in the same PR:
- `workflow_dispatch` added to `frontend-ci.yml` — enables manual runs from the GitHub Actions UI
- `.github/workflows/**` added to `frontend-ci.yml` path filter — workflow-only PRs now
  automatically trigger `quality-check` without any manual workaround

CI gate finding: GitHub does NOT count `workflow_dispatch` runs toward branch protection required
status checks. The path filter addition (not `workflow_dispatch`) is what permanently resolves the
workflow-only PR gate problem.

### Latest Merged Work — Write-Schema Audit Completion + E2E Reliability (PR #43)

PR #43 (`a8e7a7c`) extended SafeBaseModel coverage to the remaining write schemas that were
not migrated in PR #42 (admin, gallery, notification schemas), closed a JSONB dict validation
gap in `profile.py::validate_social_links`, added JSONB settings dict validation in
`group_chat.py`, and applied CI skip guards to the 7 most flaky Playwright stress tests.
Squash-merged cleanly to main.

### Latest Merged Work — SafeBaseModel NUL/Surrogate Hardening (PR #41 + PR #42)

PR #41 (`22b4a35`) and PR #42 (`eeb97b0`) landed the full fix for asyncpg encoding failures
exposed by Schemathesis contract tests. Both squash-merged cleanly to main.

### What Was Shipped

#### Root Cause Discovery
asyncpg has **3 separate encoding paths** depending on column type, each raising a different
exception when given NUL bytes (`\x00`) or lone Unicode surrogates (`\ud800`–`\udfff`):
1. Plain `String` columns → `asyncpg.exceptions._base.InterfaceError`
2. `ARRAY(String)` columns → different asyncpg encoding path, bypasses global handler
3. `JSONB` `Dict[str, str]` → JSON serializer raises yet another exception type

The single reliable interception point is the **Pydantic validation layer** (before any asyncpg call).

#### PR #41 — Global Handlers (commit `22b4a35`)
- `backend/app/main.py`: added `SQLAInterfaceError` + `UnicodeError` global exception handlers
- `backend/app/schemas/profile.py`: `ProfileBase.validate_string_lists` for `List[str]` fields

#### PR #42 — SafeBaseModel Pattern (commit `eeb97b0`)
- **NEW**: `backend/app/schemas/base.py`
  - `_assert_safe_string(s: str) -> str` — rejects NUL bytes and lone surrogates; returns `s`
  - `SafeBaseModel(BaseModel)` — `model_validator(mode='before')` runs on all str/list[str] fields
- `backend/app/schemas/profile.py` — `ProfileBase` inherits `SafeBaseModel`
- `backend/app/schemas/community.py` — all 7 write schemas switched to `SafeBaseModel`
- `backend/app/schemas/chat.py` — `MessageBase`, `ChatRoomBase` switched
- `backend/app/schemas/group_chat.py` — all 5 write schemas switched
- `backend/app/schemas/story.py` — `StoryBase`, `StoryUpdate` switched; F401 ruff fix
- `backend/app/api/profiles.py` — inline JSONB validation loop in `update_privacy_settings`
- **Bug fixed**: `_assert_safe_string` was returning `None` (missing `return s`) — caused 422 on valid inputs

#### PR #43 — Remaining Schema Coverage + E2E Reliability (commit `a8e7a7c`)
- `backend/app/schemas/admin.py` — `SuspendUserRequest`, `BanUserRequest`, `UpdateUserRequest` → `SafeBaseModel`
- `backend/app/schemas/gallery.py` — `AlbumCreate`, `AlbumUpdate` → `SafeBaseModel`
- `backend/app/schemas/notification.py` — `NotificationPreferencesUpdate` → `SafeBaseModel`
- `backend/app/schemas/profile.py` — `validate_social_links` now calls `_assert_safe_string` on every key and URL value (previously unguarded for unknown keys)
- `backend/app/schemas/group_chat.py` — `GroupChatUpdate.settings` field_validator walking all keys/string values for NUL bytes
- `frontend/tests/e2e/chat-virtual-scroll-stress.spec.ts` — `test.skip(!!process.env.CI)` guards all 7 stress tests in CI
- `frontend/tests/e2e/auth-google.spec.ts` — replaced 30s unbounded `waitForRequest` with 5s timeout + null-safe assertion branches

### Repository Health
- **Branch**: `main`, local synced to `5bcd5b9` (merge commit for PR #87) as of this content's
  writing — the most recent app-code change on `main`.
- **CI Status**: `quality-check` is the only literal required branch-protection status check
  (confirmed via `gh api .../branches/main/protection`) and was green on PRs #85, #86, #87. A known
  non-blocking flake (`totp_secret`-related CI failure) was investigated this session — reproduced
  CI's exact environment locally and everything passed, so it's likely a GitHub Actions
  runner/pip-cache-specific quirk, not a real bug. See Notes for Next Session below.
- **Railway**: now runs **two** services from this repo — `bgc-replica` (web, unchanged) and the
  newly-created `celery-worker` (added this session, PR #86/#87). Both share `backend/railway.json`;
  `backend/start.sh` branches on `RAILWAY_SERVICE_NAME` to pick the right start command per service.
  `backend/Procfile` is deleted — no longer referenced anywhere.
- **Celery**: confirmed actually processing tasks in production for the first time ever as of this
  session (`LLEN celery` drained 1 → 0, worker logs show full task registry). **Resend email
  sending itself is still blocked** — "bgclive.online domain is not verified" — needs DNS
  verification in the Resend dashboard, not a code fix.
- **Production DB**: still on the schema from the 2026-07-03 migration (33 tables) plus this
  session's new `user_warnings` table (PR #85 migration, verified upgrade/downgrade against a
  throwaway Postgres 17 container before applying to Supabase). The `messages` table's monthly
  partition automation gap (see #66 investigation above) is **still unfixed** — every message since
  January 2026 is landing in `messages_default`; this was investigated, not remediated. **[Fixed the
  next day, PR #89 (2026-07-14) — see "Bridging Session — 2026-07-13/14" near the top of this file.
  `status_updates` is now partitioned too, and a weekly Celery Beat task keeps future partitions
  created automatically. This line is left as-is for historical accuracy of the state at the time.]**
- **Working tree**: untracked `.agents/`, `.claude/skills/`, `backend/.agents/`, `backend/.mcp.json`,
  `backend/skills-lock.json`, `skills-lock.json` (skill/MCP tooling artifacts, not app code) — same
  as prior sessions, still not investigated/committed.
- **SafeBaseModel coverage**: still incomplete for `chat.py`, `admin.py`, `groups.py`,
  `moderation.py` query params — carried forward again this session, not touched.

## Current Objectives

### Completed (as of 2026-07-16, PR #119-#122 session)
- [x] PR #119 merged (squash, `3aa7fe2`) — `src/lib/auth.ts`/`performance.ts`/`offline-storage.ts` test
      coverage, 0%→100% lines/functions. Also fixed a broken `frontend/node_modules/.bin/vitest`
      symlink (Synology Drive sync had flattened it into a real file copy).
- [x] PR #120 merged (squash, `e64108c`) — `src/lib/prisma.ts` test coverage, rounding `src/lib` out
      to 100% lines/functions across every file.
- [x] PR #121 merged (squash, `36ecb13`) — removed the redundant/broken CLI `deploy` job from
      `Deploy Frontend`; production was confirmed unaffected throughout (Vercel's native GitHub
      integration deploys independently and was never broken).
- [x] PR #122 merged (squash, `cca5c04`) — backend `verification.py`/`moderation.py` endpoint test
      coverage (19 + 47 tests), closing the last item flagged open by the PR #116 session below.
      Found and documented (not fixed) a likely real bug: `GET /api/moderation/stats`'s
      `resolved_today` counts by `created_at`, not actual resolution time.
- [x] All four branches (`test/lib-coverage-auth-performance-offline-storage`,
      `test/lib-prisma-coverage`, `fix/remove-redundant-deploy-job`,
      `test/verification-moderation-api-coverage`) deleted (local + origin).

### Completed (as of 2026-07-16)
- [x] PR #115 merged (squash, `3feaa0f`) — fixes a real, currently-live production bug: `messages`
      has had zero partitions attached since 2025-12-21 (an unreviewed autogenerate side effect of
      migration `96be264b314b` dropped `messages_default`/`messages_y2025m12`). Confirmed live in
      production via a read-only query (user-approved). Not yet applied to production — needs a
      real deploy + `alembic upgrade head`.
- [x] PR #116 merged (squash, `62167f5`) — endpoint-level test coverage added for the 5
      `backend/app/api/*.py` modules that had none (`block.py`, `forums.py`, `groups.py`,
      `notifications.py`, `stories.py`, 53 new tests). Also fixed a real `GET /api/forums/tree`
      `MissingGreenlet` crash bug found while writing the tests.
- [x] Both branches (`fix/66-restore-messages-partitions`,
      `test/api-block-forums-groups-notifications-stories`) deleted (local + origin).
- [x] Obsidian vault notes for Issue #66/DB partitioning and backend API test coverage updated via
      `obsidian_*` MCP tools (patched existing notes, no new orphan notes created).

### Completed (as of 2026-07-15)
- [x] PR #113 merged (squash, `3a3ef47`) — gallery/groups/social page test coverage, closing out the
      `src/app/` page-level coverage initiative (#108, #110, #111, #112, #113).
- [x] Branch `test/app-gallery-groups-social-coverage` deleted (local + origin).
- [x] Stale untracked `frontend/tests/unit/forums.test.ts` (dead duplicate, zero real coverage)
      deleted.

### Completed (as of 2026-07-13)
- [x] Issue #65 — full moderation warning system planned, implemented, tested, and merged (PR #85,
      merge `583d7e0`). 27/27 spec tasks complete at `specs/014-moderation-warning-system/`.
- [x] Celery worker production incident found and fully fixed (PR #86, PR #87) — a `celery-worker`
      Railway service now exists, deploys successfully, and is confirmed draining the task queue.
      Missing `RESEND_API_KEY`/`RESEND_FROM_EMAIL`/`APP_URL` production env vars also set.
- [x] Issue #66 (DB partitioning) investigated in depth (two real pre-existing bugs found: the
      `messages_default` catch-all and dropped FK/index) — implementation deliberately **not**
      started; see paused-work note above before resuming. **[Corrected 2026-07-15: this was actually
      completed the very next day, PR #89/#90 — see "Bridging Session — 2026-07-13/14" above. Left
      as-is to preserve what this session actually knew at close time.]**
- [x] PR #84 merged in the interim (`env.md` Upstash → Railway doc fix) — closes an item that was
      open in the previous session's Next Session Priorities.

### Completed (as of 2026-07-13/14, backfilled 2026-07-15 — see Bridging Session above)
- [x] Issue #66 (DB partitioning) fully implemented and merged (PR #89, PR #90) — `messages_default`
      catch-all fixed, `status_updates` partitioned, weekly Celery Beat automation added,
      `create_scoped_engine()` event-loop bug fixed. Spec at `specs/015-postgres-partitioning/`.
- [x] Three real production bugs found and fixed via test-coverage work: chat router never mounted
      (PR #91, chat API was 404ing entirely), group chat message history/replies/avatars broken
      (PR #94), Android sessions misreported as OS "Linux" (PR #95).
- [x] Coverage-measurement bug fixed: `coverage.py`'s default tracer under-reports async functions
      with sequential awaits; `backend/.coveragerc` (`core = sysmon`) fixed it — real backend
      coverage is 71%, not the 63% previously assumed (PR #93).
- [x] Backend service test coverage added: `socket_config.py`, `admin.py`, `chat.py` (service +
      API), `totp_service.py`, `location.py`, `password_reset_service.py`,
      `verification_service.py`, `moderation_service.py`, `storage.py`, `media_processor.py`
      (PR #91-#93, #96-#102).
- [x] Frontend unit coverage added for `src/services/`, `src/store/`, `src/hooks/`, and
      `src/components/` (chat/forums/feed/auth, ui primitives, gallery/admin/moderation/pwa/layout,
      profile) (PR #103-#109), bringing frontend from ~5% overall toward the subsequent
      page-level coverage push (PR #110-#113).

### Completed (as of 2026-07-12)
- [x] Local dev environment repaired on a new Linux workstation: Windows venv replaced with a
      Linux `python3.12` venv, `REDIS_URL` updated from a dead Upstash host to the live Railway
      Redis public-proxy URL, `frontend/node_modules/.bin/*` execute bits restored, stale
      Turbopack `.next/` cache cleared. Both dev servers verified booting (backend `/health` 200,
      frontend `/` 200) then stopped. No app code changed; nothing to commit except these docs.

### Completed (as of 2026-07-03)
- [x] PR #55 merged — CSP Railway allowlist, rate-limit loosening, cookie-domain fix, Socket.io
      CORS regex, mobile tab a11y, forums author_id bug, 2FA input a11y, `/share-target` route,
      assorted E2E fixes, `next.config.ts` rewrite env-awareness fix
- [x] Production Supabase database migrated for the first time (`alembic upgrade head`)
- [x] Vercel Protection-Bypass rewrite limitation diagnosed and worked around
- [x] E2E health improved from near-total failure (~384 tests) to 60-73/65-76 passing per shard
- [x] PRs #46-#54 merged in the interim (E2E timeout sharding, CODECOV/SENTRY tokens, nightly
      stress workflow, E2E deployment targeting, mock data fixes, admin route protection,
      fastapi version pin) — see bridging note above

### Next Session Priorities
0. ~~**deploy PR #115 to production**~~ — **confirmed deployed 2026-07-16, same session**.
    `messages` had zero partitions attached in production since 2025-12-21 (confirmed via a live
    read-only query); every `INSERT` into `messages` was failing outright. PR #115 fixed this
    (`k5l6m7n8o9p0_restore_messages_partitions.py`); merging to `main` auto-triggered
    `Deploy Backend`'s deploy job (`railway up`), which succeeded, and `backend/start.sh` ran
    `alembic upgrade head` on the resulting container restart. A follow-up read-only query
    confirmed `alembic_version` = `k5l6m7n8o9p0` with `messages_default`/`messages_y2026m07`/
    `messages_y2026m08` all present in production. No action needed next session.
0b. ~~**backend `app/api/` route-handler coverage — `verification.py`/`moderation.py` gap**~~ —
   **DONE, PR #122 (2026-07-16)**. PR #116 closed the 5-module gap found in that session (`block.py`,
   `forums.py`, `groups.py`, `notifications.py`, `stories.py`); PR #122 closed the remaining two
   (`tests/test_verification_api.py` 19 tests, `tests/test_moderation_api.py` 47 tests). Still
   carried forward, untouched: `topical/[slug]/page.tsx` coverage (currently 82.4%, intentionally
   incomplete) should be revisited once its real data-fetch endpoint replaces the current
   hardcoded-empty-array stub. Also still carried forward, now across **four** sessions: the
   untracked local tooling files (`.agents/`, `.claude/skills/`, `backend/.agents/`,
   `backend/.mcp.json`, `backend/Procfile`, `backend/skills-lock.json`, `skills-lock.json`, plus a
   modified-but-unstaged `.claude/settings.local.json`) should be either gitignored or committed
   intentionally so `git status` stays clean — still unresolved, not touched this session either.
0c. **New, from 2026-07-16 (PR #119-#122 session) — likely real bug, needs a human decision**:
   `GET /api/moderation/stats`'s `resolved_today` field filters `ContentReport.created_at >= today's
   start AND status == RESOLVED` — there's no `resolved_at`/`reviewed_at` column, so this actually
   counts reports *created* today that happen to be resolved, not reports *resolved* today. A report
   created yesterday and genuinely resolved today via `POST /resolve` is NOT counted.
   `tests/test_moderation_api.py::TestGetModerationStats::test_resolved_today_counts_by_created_at_not_actual_resolution_time`
   demonstrates this concretely. Needs either a schema change (add a `resolved_at` column) or a
   docs/UI fix acknowledging the field means something narrower than its name suggests.
0d. **New, from 2026-07-16 — `test_api_contract.py` DB isolation gap, low urgency**: bypasses the
   `db_session` per-test-rollback fixture (`TestClient` on `app.main.app` directly, no
   `dependency_overrides` for `get_db`), so schemathesis's fuzzed mutating requests commit for real.
   Currently harmless only because no CI workflow runs it combined with other test files in one
   `pytest` process (`backend-ci.yml`/`pr-validation.yml` `--ignore` it; `deploy-backend.yml` runs it
   as a fully separate, later invocation) — fragile-by-accident, not by design. A future session
   should wrap its `TestClient`/schema fixture in the same `db_session`-backed override pattern. Also:
   `schemathesis`/`starlette_testclient` aren't pinned in `requirements.txt` at all despite
   `deploy-backend.yml` needing them.
0e. **New, from 2026-07-16 — docs fix, trivial**: `CLAUDE.md`'s documented backend lint command
   (`black . && flake8 .`) is stale — this repo's actual CI linter is `ruff check .`
   (`backend-ci.yml`), and `flake8` isn't even in `requirements.txt`.
0f. **New, from 2026-07-16 — infra recommendation, not code**: exclude `frontend/node_modules/`,
   `backend/venv/`, and preventively `frontend/.next/` from Synology Drive sync on this Linux
   workstation (Settings → Sync, in the Synology Drive Client, not something fixable from this repo).
   Both `node_modules/.bin/vitest` (this session, again) and `backend/venv` (this session, new) have
   now been corrupted by sync flattening symlinks / dropping files mid-write on rapid-many-small-file
   directories. All three paths are already gitignored, so nothing is lost by excluding them.
1. **New, urgent — Resend domain verification**: `bgclive.online` is not verified in the Resend
   dashboard, so even though the Celery worker is now correctly processing tasks in production,
   actual email sends (verification, password reset, warnings) still fail at the Resend API level.
   This is a dashboard/DNS action, not a code fix — flagged clearly so it isn't mistaken for
   something this session left broken.
2. ~~**resume Issue #66 (DB partitioning) from scratch**~~ — **DONE, PR #89/#90 (2026-07-14)**.
   `messages_default` catch-all fixed, `status_updates` partitioned, weekly automation added via
   Celery Beat, plan/tasks written to `specs/015-postgres-partitioning/`. See "Bridging Session —
   2026-07-13/14" above for full detail. **Update, 2026-07-16**: that same automation's migration
   history had a hidden bug — see priority -1 above and PR #115. The
   `backend/scripts/backfill_messages_partitions.py` question below is now moot until PR #115's
   fix is deployed (before that, there was nothing to backfill *from* correctly, since `messages`
   couldn't accept inserts at all). Once PR #115 is deployed, still run
   `backend/scripts/backfill_messages_partitions.py` against production to redistribute any rows
   that may have landed anywhere unexpected — this session did not verify whether that backfill has
   actually been executed against the real Supabase database.
3. **New, non-blocking — `totp_secret` CI flakiness**: investigated this session; root cause not
   found. CI's exact environment was reproduced locally and everything passed, so it's likely a
   GitHub Actions runner/pip-cache-specific quirk rather than an app bug. Not something this session
   left broken — just unresolved.
4. **`search-advanced.spec.ts` "should apply filters and update results"** *(possibly already fixed
   by PR #57 — verify against current `main` before spending time on this)*: the Ethnicity/Position
   dropdown's option list stops appearing after selecting the first filter
   (`getByRole('option', {name: 'Black'})` times out). Needs Playwright UI mode or trace viewer to
   diagnose (curl can't drive client-rendered React).
5. **Residual WebKit-only flakiness**: `auth-2fa`/`auth-credentials` on mobile-safari went from
   100%-deterministic failure to intermittent after the DB migration fix, but aren't fully
   resolved. Likely Playwright-WebKit-on-Linux-CI environmental flakiness rather than an app bug.
   *(PR #59 in the interim claims to improve WebKit/mobile-safari stability — verify.)*
6. **NUL-byte/surrogate query-param validation audit** *(possibly already fixed by PR #58 —
   verify against current `main` before spending time on this)*: the same class of bug fixed in
   `search.py` this session (query params bypassing `SafeBaseModel`) likely existed in `chat.py`'s
   `category` param, `admin.py`'s `query`/`action` params, `groups.py`'s `query` param, and
   `moderation.py`'s `status_filter`/`content_type` params.
7. **Consider a dedicated non-production backend/database for E2E**: flagged in an earlier session
   too. The production-DB-never-migrated incident is a strong argument — E2E currently shares fate
   with production data/schema.
8. Carried forward, still non-blocking: move CI-skipped E2E stress tests to a nightly workflow,
   `CODECOV_TOKEN`/`SENTRY_AUTH_TOKEN` secrets (may already be wired via PR #47 — verify).
9. **Verify the search filter active-count UI / toast notifications work**:
   `frontend/src/app/(protected)/profile/edit/page.tsx` and
   `frontend/src/app/(protected)/users/page.tsx` carried uncommitted local WIP at a previous
   session's start; a required `origin/main` merge revealed that WIP's diff was already fully
   present upstream — the local copy collapsed to zero diff against `main`, with no manual edits
   made to either file. This is a mechanical git outcome, not a verified-correct one — spot-check
   both features against current `main` to confirm nothing was silently dropped in the
   reconciliation. (Carried forward again — not touched this session.)

## Environment Status

### Development Services
- Backend: FastAPI on http://localhost:8000
- Frontend: Next.js on http://localhost:3000
- Database: PostgreSQL (async via asyncpg, Supabase-hosted)
- Redis: Railway-hosted (migrated off Upstash; `env.md` corrected in PR #84). Local dev
  connects via Railway's public proxy URL (`redis://default:***@reseau.proxy.rlwy.net:31149`),
  not the internal `redis.railway.internal` hostname, which only resolves inside Railway's network.
- Socket.io: Real-time chat, comments, presence
- Celery: Async email delivery worker — **now actually running in production** as of this session
  (`celery-worker` Railway service, PR #86/#87). Real sends still blocked on Resend domain
  verification (`bgclive.online`) — see Next Session Priorities above.

### Branch & Git State
- **[2026-07-16 later-session update]** Active branch: `main`, local in sync with `origin/main`
  (HEAD `cca5c04`, squash-merge commit for PR #122, on top of `36ecb13`/`e64108c`/`3aa7fe2` for PRs
  #121/#120/#119 and `38dc6bc`/`547f452` for #118/#117 below).
- This session added: PR #119 (`3aa7fe2`), PR #120 (`e64108c`), PR #121 (`36ecb13`), PR #122
  (`cca5c04`) — all four branches deleted (local + origin) after merge. No doc-close commit landed
  yet as of this writing; this file's own update is that commit, staged for the human/agent closing
  this session to commit.
- **[2026-07-16 update]** Active branch: `main`, local in sync with `origin/main` (HEAD `62167f5`,
  squash-merge commit for PR #116, on top of `3feaa0f` for PR #115). Local `main` had diverged from
  `origin/main` at session start (this session's docs-close commit for 2026-07-15 vs. #115/#116
  merged directly on GitHub) — reconciled via `git rebase origin/main` (clean, no conflicts; the
  prior docs commit's content was already fully present after the rebase).
- This session added: PR #115 (messages partition restore fix, squash-merged `3feaa0f`) and PR #116
  (backend API endpoint test coverage, squash-merged `62167f5`), plus this doc-close commit.
- Both `fix/66-restore-messages-partitions` and `test/api-block-forums-groups-notifications-stories`
  branches deleted (local + origin) after merge.
- `git status` still shows one modified-but-unstaged file (`.claude/settings.local.json`) and the
  same several untracked local tooling/config paths as prior sessions — none committed this session;
  see the "Untracked local tooling files" note above.
- Remote: https://github.com/z3r0fidev/bgc-replica

*(Text below this point describes state as of the 2026-07-15 close-out and is preserved for
historical accuracy; see the 2026-07-16 update above for current state.)*
- Active branch: `main`, local in sync with `origin/main` (HEAD `3a3ef47`, merge commit for PR #113)
  as of this content's writing.
- This session added: PR #113 (gallery/groups/social page test coverage, squash-merged) on top of
  PR #114 (already on `main` when this session began, a standalone tsc fixture-typing fix), plus
  this doc-close commit.
- Branch `test/app-gallery-groups-social-coverage` deleted (local + origin) after merge.
- `git status` shows one modified-but-unstaged file (`.claude/settings.local.json`, local
  permissions config) and several untracked local tooling/config paths — none committed this
  session; see the "Untracked local tooling files" note above.
- Remote: https://github.com/z3r0fidev/bgc-replica

### Local Machine Notes (multi-machine setup)
- This project is now actively developed from at least two machines: a Windows machine (prior
  sessions) and this Linux workstation (2026-07-12 session). `backend/venv/` and
  `frontend/node_modules/` are both gitignored and machine-specific — each machine maintains its
  own, no repo conflict. On Linux, `backend/venv` uses `python3.12` (`bin/` layout); do not assume
  the `Scripts/`-layout Windows venv paths referenced in older notes below apply here.
- The repo directory lives inside a Synology Drive sync folder on this Linux machine. Sync can
  transiently show large numbers of false "deleted" files in `git status` (mid-sync snapshot) and
  can strip POSIX execute bits from files it re-syncs (hit `frontend/node_modules/.bin/*` this
  session). If `git status` ever again shows a large wave of unexplained deletions or an installed
  binary suddenly gets "Permission denied", suspect Synology sync first before assuming repo
  corruption.
- **[2026-07-16 later-session update] Two more concrete corruption instances, same root cause**:
  `frontend/node_modules/.bin/vitest` was found flattened from an npm symlink into a real file copy
  (broke `npx vitest`'s relative `import './dist/cli.js'` — fixed by recreating the symlink + exec
  bit), and `backend/venv` came out of a fresh `python3.12 -m venv` + `pip install` with `pip`'s own
  `_vendor` directory missing entirely (fixed by rebuilding the venv in the session's scratchpad
  directory, outside the synced tree, instead). Both are rapid-many-small-file-write directories
  inside the sync folder — this looks like a systemic pattern, not one-off flakes. **Recommended,
  not yet actioned**: exclude `frontend/node_modules/`, `backend/venv/`, and preventively
  `frontend/.next/` from Synology Drive sync via the Synology Drive Client's own settings (a
  machine/account-level change, not something fixable from within this repo) — all three are already
  gitignored, so nothing is lost by excluding them. See Next Session Priorities item 0f.

## Key Decisions

### Warning System Architecture (PR #85)
1. **Dedicated `user_warnings` table over piggybacking `admin_action_logs`**: escalation-count
   queries (how many active warnings does this user have) need to stay fast and simple; a
   general-purpose audit table would require filtering by action type on every read.
2. **Single shared `warning_service.issue_warning()` for both issuance paths**: report-resolution's
   `warn_user` action and the admin user detail page's direct "Issue Warning" button both call the
   same function — avoids duplicated escalation/email logic.
3. **Reuse existing suspension fields for auto-escalation**: `WARNING_ESCALATION_THRESHOLD`
   breaches call the same fields `suspend_user` already sets, rather than inventing a parallel
   suspension mechanism.
4. **Fix `_resolve_report_target_user_id()` as part of this work, not deferred**: without it,
   warning/banning from a `THREAD`/`POST`/`STATUS` report would have silently no-op'd — a
   pre-existing correctness gap directly blocking this feature's report-driven path.
5. **Temporary unauthenticated preview route for visual QA, deleted before commit**: needed to see
   `WarningEscalationMeter`/`WarningHistoryList` in light/dark mode without a full authenticated
   flow; never shipped.

### Celery Production Fix Architecture (PR #86 + #87)
1. **`RAILWAY_SERVICE_NAME`-branching `start.sh` over per-service dashboard Custom Start Command**:
   the dashboard setting is silently overridden by `railway.json`'s checked-in `startCommand` —
   confirmed empirically, not documented by Railway anywhere obvious. A single script shared by both
   services, branching on Railway's own auto-injected env var, is more robust than depending on a
   dashboard field that can silently lose to config-as-code.
2. **Delete `Procfile` rather than leave it as dead documentation**: confirmed unused by any CI
   workflow or local tooling first; leaving a stale `worker:` line that nothing reads would mislead
   the next person into thinking the worker was already wired up (as this session initially assumed
   until proven otherwise).
3. **Remove `healthcheckPath` from the shared `railway.json` entirely, not scope it**: Railway's
   config format has no per-service conditional block, so a shared HTTP healthcheck can never
   correctly apply only to `bgc-replica`. `bgc-replica` falls back to Railway's default TCP-level
   check, which is sufficient.
4. **Production secrets piped directly between commands, never printed**: `RESEND_API_KEY` etc. set
   via `railway variable set` with values piped straight in — the permission classifier correctly
   blocked a couple of attempts that would have exposed them (a truncated/redacted print, a
   diagnostic probe write); each time the session either found a non-printing path or asked the user
   to name the exact value/action before proceeding.

### DB Partitioning (#66) — decision to pause, not a technical decision about the schema
User was explicitly told partitioning `messages`/`status_updates` by `created_at` will **not**
speed up the app's actual hot-path queries (chat history is filtered by `conversation_id`/`room_id`;
feed reads don't filter by date at all) — the benefit is table maintenance/vacuum at scale and
future analytics/retention, not per-query latency. User chose to proceed with the full scope anyway
once work resumes; this session paused purely because the Celery incident took priority, not because
of any doubt about the plan's soundness.

**[Update, 2026-07-15]**: work resumed the next day and shipped in full (PR #89/#90) — see
"Bridging Session — 2026-07-13/14" near the top of this file and the corresponding Next Session
Priorities entry above. The rationale captured here (why partitioning matters despite not helping
hot-path latency) held and is why the full scope was implemented rather than a partial fix.

**[Update, 2026-07-16]**: PR #89's own implementation had a latent bug of its own — the very next
migration in its chain, `96be264b314b` (2025-12-21, nominally an unrelated autogenerate for a
`profile` column), had unreviewed side effects dropping `messages_default` and
`messages_y2025m12`, leaving `messages` with zero partitions attached in every environment
including production ever since. Fixed by PR #115 (`k5l6m7n8o9p0_restore_messages_partitions.py`),
**confirmed deployed to production the same session** (see below). Not a flaw in the #66 design
decision itself — a downstream migration-review gap. See the "Latest Session — PR #115" entry near
the top of this file for full detail.

### Deploy Frontend: Removed the Redundant CLI Deploy Job, Did Not Fix It (PR #121, 2026-07-16)
1. **Two independent deploy paths existed for the same app**: Vercel's native GitHub integration
   (auto-builds/deploys every push to `main`, `source: "git"` in the Vercel API, no GitHub Actions
   involvement at all) and `.github/workflows/deploy-frontend.yml`'s own `deploy` job (`vercel pull`
   → `vercel build --prod` → `vercel deploy --prebuilt`, entirely separate). Only the second one was
   broken (`Error: Invalid rewrite found`, `NEXT_PUBLIC_API_URL` not resolving to a valid URL via
   `vercel pull` — likely flagged "Sensitive" in Vercel's dashboard, which excludes it from CLI pulls
   run outside Vercel's own build infra).
2. **Removed rather than fixed**: since the native integration was already successfully deploying
   every push independently (confirmed live on `www.bgclive.online` throughout the failures), the
   broken CLI job was pure duplicate effort with a spurious-but-real-looking CI failure as its only
   observable effect. Fixing the CLI-side env var resolution gap was explicitly not attempted —
   removing the redundant job was strictly less work and equally correct.
3. **Do not re-add a CLI-based `vercel deploy` step to this workflow** without first checking whether
   Vercel's native GitHub integration is still connected and deploying successfully on its own (check
   the Vercel dashboard's Git integration settings, or query the Vercel API for recent deployments'
   `source` field) — if it is, a second deploy path is redundant by construction, not just currently
   broken.
4. **If a working CLI-based deploy is ever genuinely needed** (e.g. to deploy from a non-`main`
   source, or to control build/deploy separately from Vercel's own webhook trigger), the actual fix
   is un-marking `NEXT_PUBLIC_API_URL` as "Sensitive" in Vercel's Production environment variables
   (Project Settings → Environment Variables) — not something this session had dashboard access to
   verify or change.

### SafeBaseModel Architecture (PR #42)
1. **Pydantic layer as single guard**: Chosen over asyncpg-level patch because it catches all
   three encoding-path variants (String, ARRAY(String), JSONB) uniformly.
2. **`model_validator(mode='before')`**: Runs before any field coercion, ensuring raw input is
   sanitized before Pydantic parses types.
3. **`SafeBaseModel` base class**: Applied to all write schemas; read-only response schemas do not
   need it (data already in DB is safe).
4. **Inline JSONB validation for dict fields**: `SafeBaseModel` handles `str` and `list[str]`
   fields automatically; dict values require explicit iteration in the endpoint.
5. **Return-value bug fixed early**: `_assert_safe_string` missing `return s` was caught before
   any merge — would have caused 422 on all valid requests.

### Previous Session Decisions (still active)
- 2FA: TOTP-based with pyotp, backup codes bcrypt-hashed
- Email verification: SHA-256 tokens, Resend, Celery async delivery
- Privacy: Field-level JSONB, three tiers, enforced server-side by ProfileService
- Rate limiting: Redis-backed, tiered per endpoint
- Admin dashboard: GZip, Sentry 10% sampling, Redis caching, batch comments, virtual scroll

## Notes for Next Session

### Important Context
- **Repo is fully clean as of 2026-07-26**: zero open issues, zero open PRs, only `main` exists as a
  branch (locally and on GitHub — 30 local + 28 remote branches and 16 stale
  `.claude/worktrees/agent-*` worktrees were deleted this session), all CI green. Every `tasks.md`
  under `specs/` was re-verified and has no other unchecked items. A future session starting from
  scratch should not assume there's leftover cleanup work — there isn't, as of this date.
- **CSP is now fully nonce-based on `script-src`, `style-src-elem`.** `style-src-attr` is
  deliberately still permissive (`'unsafe-inline'`-equivalent) — Radix/Framer Motion/
  `@tanstack/react-virtual`/`@dnd-kit` set inline `style` *attributes* via JS at runtime, which no
  nonce/hash source can ever cover; this is a real platform constraint, not an oversight. If CSP
  work resumes, read the PR #128 entry above first — two non-obvious JS-injected-`<style>` bugs
  (sonner's Toaster, React DOM's `<style precedence>` Resource path) were found there and are easy
  to reintroduce if `frontend/patches/sonner+2.0.7.patch` or the `STYLE_ELEM_HASHES` allowlist in
  `frontend/src/proxy.ts` are ever removed/regenerated without re-deriving hashes against a real
  build.
- **Distributed tracing is Sentry-based, not OpenTelemetry.** The OTel `TracerProvider`/
  `OTLPSpanExporter` code and packages were deliberately removed in PR #129, not left dormant —
  don't reintroduce OTel without a real collector target and a reason Sentry's native tracing
  (already wired end-to-end, frontend `instrumentation-client.ts` + backend `CORSMiddleware`
  `allow_headers`) doesn't cover.
- **Recurring pattern worth flagging for future spec/issue audits**: twice now a checklist item
  marked "done" in a spec's `tasks.md` didn't match reality without verification — Spec 007 T008
  (claimed OTel tracing was implemented; it was disconnected/unreachable, PR #129) and, in the
  opposite direction, Spec 015 Phase 7 T025-T031 (claimed *unchecked*/not done; production had
  actually completed all of it, PR #130). Don't trust a checklist's checked/unchecked state at face
  value for production-impacting claims — verify against the actual running system (read-only
  queries, `railway logs`, etc., with explicit user approval before touching production) before
  reporting status either way.
- **`ruff` is now pinned to `0.15.22`** in `.github/workflows/backend-ci.yml`,
  `.github/workflows/pr-validation.yml`, and `.github/workflows/deploy-backend.yml` (PR #129). Ruff
  0.16.0 changed its default rule selection and surfaced 986 pre-existing findings across untouched
  test files — if backend CI ever fails with a large, unexplained wave of new lint findings again,
  check whether an unpinned `pip install ruff` picked up a new major/minor version before assuming
  new code broke something.
- ~~**`CLAUDE.md`'s documented backend lint command is stale**~~ — **fixed, PR #124 (2026-07-1x,
  session prior to this one)**: `CLAUDE.md` now correctly documents `ruff check .`, matching
  `backend-ci.yml`. Left below (struck through) since a later entry in this same file had flagged it
  as not-yet-fixed; corrected here as of this session's close-out.
- **Backend `app/api/` route coverage is now complete for all previously-zero-coverage modules.**
  PR #116 (2026-07-16) closed `block.py`/`forums.py`/`groups.py`/`notifications.py`/`stories.py`; PR
  #122 (2026-07-16, later session) closed the remaining `verification.py`/`moderation.py`. If a
  future session is asked to find more backend API coverage gaps, cross-reference every router's URL
  prefix in `backend/app/api/*.py` against `backend/tests/test_*_api.py`/`test_*.py` file names the
  same way these two sessions did — don't assume more exist without checking, but also don't assume
  none exist without actually cross-referencing.
- **`GET /api/moderation/stats`'s `resolved_today` field likely has a real logic bug** — see Next
  Session Priorities item 0c above. Don't "fix" tests to hide this if touching this endpoint; the
  existing test (`test_resolved_today_counts_by_created_at_not_actual_resolution_time`) documents the
  actual (buggy-looking) behavior deliberately.
- **`Deploy Frontend`'s `deploy` job was removed in PR #121 (2026-07-16), not fixed.** Vercel's
  native GitHub integration is the sole frontend deploy mechanism now — see the new Key Decisions
  entry above before ever considering re-adding a CLI-based deploy step to this workflow.
- **This machine (Linux workstation, Synology Drive-synced repo folder) has now corrupted two
  different gitignored build directories** (`frontend/node_modules/.bin/vitest`, `backend/venv`) via
  what looks like a systemic sync issue with rapid-many-small-file-write directories, not one-off
  flakes. If `npx vitest`/`pip install`/any dev-tooling command behaves inexplicably on this machine,
  suspect this before assuming a real code/config problem — see Local Machine Notes above for the
  recommended (not yet actioned) Synology Drive sync exclusions.
- **`schemathesis`/`starlette_testclient` are used by `deploy-backend.yml` but not pinned in
  `requirements.txt`.** If a fresh venv/CI runner ever needs to run `tests/test_api_contract.py`
  directly (outside that one workflow step), it will need these installed manually until someone
  pins them. Also see the `test_api_contract.py` DB-isolation gap in Next Session Priorities item 0d
  before ever running it combined with other test files in one `pytest` process.
- ~~`CLAUDE.md`'s documented backend lint command is stale~~ — **fixed, PR #124.** (See the
  corrected note near the top of "Notes for Next Session" above.)
- ~~`messages` cannot accept inserts in production right now~~ — **fixed and confirmed deployed,
  2026-07-16**. PR #115 fixed the root cause (a migration,
  `k5l6m7n8o9p0_restore_messages_partitions.py`, restoring `messages_default` and current/next-month
  partitions), merging to `main` auto-deployed it via `Deploy Backend`'s `deploy` job, and a
  follow-up direct read-only production query confirmed `alembic_version` = `k5l6m7n8o9p0` with the
  partitions present. No action needed.
- **Backend `app/api/` route coverage: `verification.py` and `moderation.py` are the last gap.**
  PR #116 (2026-07-16) closed the other 5 zero-coverage modules (`block.py`, `forums.py`,
  `groups.py`, `notifications.py`, `stories.py`) and fixed a real `GET /api/forums/tree`
  `MissingGreenlet` crash along the way (`backend/app/api/forums.py`).
- **Read the "Bridging Session — 2026-07-13/14" entry near the top of this file before assuming
  anything about DB partitioning, chat, group chats, session device info, or backend/frontend
  coverage is still open** — a large body of work (PRs #89-#109) landed without being documented
  until this 2026-07-15 close-out backfilled it. Key facts: Issue #66 is done, not paused; the chat
  API was completely unreachable in production until PR #91 (router never mounted); group chat
  message history/replies/avatars were broken until PR #94; Android session device info was wrong
  until PR #95; and `backend/.coveragerc` (`core = sysmon`) fixed a real coverage-under-reporting
  bug in `coverage.py` for async code (PR #93) — real backend coverage is 71%, not 63%.
- **Resend domain verification is the one real open gap from this session**: `bgclive.online` is
  not verified in the Resend dashboard, so emails still fail to actually send even though Celery is
  now correctly processing the tasks that queue them. This is an external dashboard/DNS action, not
  a code TODO — do not spend time debugging the Celery/worker code path for this.
- **`totp_secret` CI flakiness is non-blocking and already investigated**: root cause not found;
  reproducing CI's exact environment locally passed cleanly, pointing at a GitHub Actions
  runner/pip-cache-specific quirk. Don't assume it's a real bug without new evidence.
- **Issue #66 (DB partitioning) has no saved plan file** — **[Stale as of 2026-07-15: this was
  completed the next day, PR #89/#90 (2026-07-14). A plan file now exists at
  `specs/015-postgres-partitioning/{plan.md,tasks.md}`. See "Bridging Session — 2026-07-13/14" near
  the top of this file. Left below for historical accuracy.]** the investigation this session (via a
  database-optimizer agent) found two real, currently-unfixed bugs (`messages_default` catch-all
  silently absorbing all messages since January 2026; dropped FK constraints/index on `messages`
  from the December 2025 migration) plus confirmed `status_updates` was never partitioned. A future
  session must re-investigate or read this session's transcript/summary before starting
  implementation — nothing is saved under `specs/`.
- **Railway now has two services sharing one config**: `bgc-replica` (web) and `celery-worker`
  (added this session). Both read `backend/railway.json` and `backend/start.sh`; the start script
  branches on `RAILWAY_SERVICE_NAME` to pick `uvicorn` vs. `celery worker`. Any future change to
  `railway.json` needs to be sane for both services (this is exactly what broke `celery-worker`'s
  healthcheck in PR #87 — a shared HTTP healthcheck path that only makes sense for the web service).
  `backend/Procfile` was deleted from git in PR #86 and should not be recreated as the source of
  truth for start commands — **note**: an untracked `backend/Procfile` (identical `web:`/`worker:`
  content to the pre-PR-86 version) exists on this machine's working tree as of 2026-07-15; it is
  not committed and was not investigated further this session (see the untracked-files note in the
  2026-07-15 entry at the top of this file).
- `backend/app/schemas/base.py` holds `SafeBaseModel` and `_assert_safe_string`. ALL new write
  schemas must inherit `SafeBaseModel`. Dict-typed fields still require explicit inline validation
  in the endpoint (model_validator does not recurse into dict values).
- Railway end-to-end is confirmed working; do not change `backend/railway.json` or the deploy
  workflow without understanding the Nixpacks / `railway up --service=$RAILWAY_SERVICE_ID` pattern.
- Vercel CLI steps in `deploy-frontend.yml` MUST run from the repo root (no `working-directory:
  ./frontend`). Vercel resolves Root Directory = `frontend` relative to the repo root. Adding a
  `working-directory` causes double-nesting (`frontend/frontend`) which breaks the deploy.
- Schemathesis contract tests run in the Backend CI `quality-check` job — if they start failing
  again, check for new write endpoints that were not given `SafeBaseModel`.
- Railway CLI v5.23.3 introduces `railway logs` (stream deploy/build logs), `railway restart`,
  and stateless `railway up --project <id>`. Token auth skips 2FA. Use `railway logs` before
  grepping Railway dashboard for 500s.
- E2E stress tests in `chat-virtual-scroll-stress.spec.ts` are now CI-skipped via
  `test.skip(!!process.env.CI)`. They still run locally. Consider scheduling them nightly.
- 24 failed/cancelled GitHub Actions runs were deleted in a previous session; history is clean.
- `workflow_dispatch` runs do NOT satisfy GitHub branch protection required status checks; only
  `pull_request`-triggered runs count. The `.github/workflows/**` path filter in `frontend-ci.yml`
  is what ensures workflow-only PRs trigger the required `quality-check` automatically.
- Only `quality-check` is a literal required branch-protection status check on `main` (confirmed
  via `gh api repos/z3r0fidev/bgc-replica/branches/main/protection`); it matches by context name
  across all three workflows that produce it (Backend CI, Deploy Backend, Frontend CI) — all three
  must be green. Playwright E2E shards, Vercel, and codecov/patch are informational/advisory only
  for merge purposes even though they show in the PR checks list.
- `is_allowed_origin` in `backend/app/core/config.py` now backs both Socket.io's `connect()`
  handler and FastAPI's `CORSMiddleware` (`allow_origin_regex`) — any future CORS logic changes
  must update both call sites or they will drift out of sync again.
- The production Supabase DB is migrated as of this session — do not assume `/health` returning OK
  means the schema exists; it only checks connectivity. If a fresh Railway/Supabase environment is
  ever provisioned again, run `alembic upgrade head` against it explicitly before assuming it works.
- Railway CLI is authenticated as Z3r0fiDeV / viralkings215@gmail.com (project "BGCLive Backend",
  workspace "Z3r0fiDeV's Projects", environment "production", services `bgc-replica` + `Redis` +
  `celery-worker` as of this session).
  This is a per-machine CLI login (`railway login`), re-authenticated on the Linux workstation this
  session via `railway link --project "BGCLive Backend"` — do not assume it's still linked on a
  machine where it hasn't been run.
  - *Windows-machine-specific* (from an earlier session, may be stale): direct DB access worked via
    `backend/venv/Scripts/python.exe` (has `asyncpg`+`alembic`) run through WSL interop with
    `-X utf8` (avoids a cp1252 console crash on an emoji arrow in `database.py`'s IPv4-resolution
    log line). On the Linux workstation the equivalent is simply `backend/venv/bin/python` — no
    WSL/encoding workaround needed.
- Supabase MCP server was added to `backend/.mcp.json` and authenticated mid-session-before-last,
  but requires a fresh Claude Code session to actually connect.
