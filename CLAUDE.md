# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Teaching Lab Form Hub — a Remix + Mantine app consolidating Teaching Lab's operational forms (weekly project log, consultant/vendor payment, coach log) and dashboards. It authenticates via Supabase Google OAuth and integrates with Monday.com (boards as the system of record) and Google Sheets (reference data).

## Commands

```bash
npm run dev          # Remix dev server on http://localhost:5174 (Vite + HMR)
npm run build        # Production build (Vercel target)
npm run typecheck    # tsc --noEmit — the primary verification gate (see below)
```

Supabase (local DB + edge functions): `npm run supa:start` / `supa:stop` / `supa:reset`, `supa:up` / `supa:down` / `supa:status` (migrations), `supa:new` (new migration), `supa:gen` (regenerate `supabase/database.types.ts`).

**There is no test framework** — `npm test` is a placeholder that exits non-zero. Verify changes with `npm run typecheck` and `npm run build`; both must pass. For behavioral checks, run the app and exercise the form, or hit the `api.*` routes directly with `curl`.

**Dev gotcha — Google Sheets egress:** Monday calls use Node's global `fetch`/undici (ignores proxy env vars), but Google Sheets calls use `googleapis`/gaxios (honors `http_proxy`/`https_proxy`). On a VPN or restricted network, the coach-log route loader (which reads Google Sheets) will hang/fail unless you start dev with proxy env, e.g. `https_proxy=http://127.0.0.1:7897 http_proxy=http://127.0.0.1:7897 npm run dev`. This is dev-only; prod (Vercel) reaches Google directly.

Path alias: `~/*` → `app/*`.

## Architecture

### Domain-driven layering (`app/domains/<domain>/`)
Each feature domain (`coach-log`, `vendor-payment`, `employee`, `project`, `coachFacilitator`) splits into:
- **`model.ts`** — types only (and small pure helpers/keys).
- **`repository.ts`** — external data access: Monday GraphQL (via the shared helpers below) and Google Sheets (`googleapis` JWT service account). Returns `Errorable<T>` (`{ data, error: null } | { data: null, error }`, from `~/utils/errorable`).
- **`service.ts`** — business logic over the repository (sort/filter/transform/dedupe). Routes call services, not repositories directly: `coachLogService(coachLogRepository())`.

### Remix routing conventions
- **Page routes** (`<feature>-form.tsx`, `dashboard.tsx`) expose a server-side `loader` for user-independent reference data fetched up front, then render a feature component. Auth/profile is resolved client-side via `useSession()`, so loaders generally don't gate on the user.
- **API routes** (`api.<feature>.<action>.tsx`) expose `action`s for client-driven POSTs: form submits and *dependent* dropdowns (options that depend on in-page selections, e.g. coachees by district+school). Pattern: the page loads static reference data via the loader; anything depending on a selection is a client `fetch` to an api route.

### Monday.com integration (`app/domains/utils.tsx`)
- `fetchMondayData(query)` — **server-side calls the Monday API directly** (with `MONDAY_API_KEY`); **client-side proxies through `/api/monday/proxy`** (keeps the key off the client).
- `insertMondayData(query, vars)` — GraphQL mutations with variables.
- Forms persist by creating Monday **board items** (parent) and **subitems**, writing specific **column IDs** that must match the target board's schema (often inherited verbatim from a legacy form). When touching submit logic, treat column IDs as a coupling to the live board — verify them against the board rather than changing them. The destination board id is centralized in the domain (e.g. `COACH_LOG_BOARD_ID`).

### Auth & session
Supabase Google OAuth restricted to the Teaching Lab email domain. `useSession()` (`app/components/auth/hooks/`) resolves a `mondayProfile` (name, email, `businessFunction`, `mondayProfileId`, `employeeId`) by looking the signed-in email up against Monday employee / coach-facilitator boards, and caches it in `localStorage`. Access gating per form is done **client-side** (e.g. `businessFunction === "contractor"` → access denied; vendor-payment gates on coach/facilitator).

### Feature components (`app/components/<feature>/`)
A feature folder holds the form container, its question sub-components (often under `questions/`), `constants.ts` (option lists + show/hide predicates), custom hooks under `hooks/` (e.g. `useCoachLogForm` wrapping Mantine's `useForm`, `useDuplicateCheck`), and pure value→payload builders (e.g. `build-submission.ts`) kept out of the component so they stay testable. Conditional question sets are driven by `shouldShow*` predicates and re-gated again in the submit route so hidden-section values are never written. UI is Mantine v7 + Tailwind (`cn` from `~/utils/utils`).

### Environment variables
Server: `MONDAY_API_KEY`, `GOOGLE_SERVICE_CLIENTEMAIL` / `GOOGLE_SERVICE_PRIVATEKEY` (Sheets JWT), `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. Stored in 1Password (see README). `process.env.VERCEL` is used to branch deploy-only behavior (e.g. serving placeholder data when a local-only source like a parquet file can't be read).

## Conventions
- End git commit messages with the standard `Co-Authored-By` trailer; branch off `main` for new work (commit/push only when asked).
- Keep diffs idiomatic to surrounding code; prefer the domain layering above over inlining external calls in routes/components.

### Gotcha — Mantine `searchable` Select doesn't visually clear on reset
A Mantine v7 `searchable` `Select` keeps an internal `searchValue` (the text shown in the input) that's separate from the controlled `value`. Clearing the value programmatically (`form.reset()` or `setFieldValue(field, "")`) updates the form state correctly but leaves the old text displayed until the field is focused again. This is a **display-only** bug — submitted data is already correct. It affects `searchable` single Selects only; `TextInput`, `MultiSelect`, and non-searchable Selects re-sync fine. Note `form.key()` only forces a remount in `useForm`'s **uncontrolled** mode — in `controlled` mode (what the forms here use) it's stable and won't help. Fix by remounting the field with your own changing `key`: bump a `resetKey` counter on successful submit and put it on the `<form>`, and/or key a dependent select by its parent value (e.g. `key={`school-${district}`}` so the school field remounts when the district changes). See `app/components/coach-log/participant-roster/participant-roster-form.tsx`.

### Ticket → GitHub project board mapping
When a change targets one of the forms below and you create a GitHub issue/ticket for it, add that ticket to the matching org Project board (`gh project item-add <N> --owner TeachingLabHQ --url <issue-url>`):
- **Coach log form** → project board **19**
- **Weekly project log form** → project board **21**
- **Vendor payment form** (a.k.a. contractor payment form) → project board **22**
