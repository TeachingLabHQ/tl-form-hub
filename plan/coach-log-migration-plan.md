# Coach Log Migration Plan

**Target launch date:** Friday, August 1, 2026
**Drafted:** 2026-05-21

---

## 1. What needs to be done by 08/01

By Friday, August 1, 2026, six things ship together:

### A. TL Question Library
A shared set of form building blocks (dropdowns, date pickers, multi-select, repeatable rows) that every form in the Form Hub uses. Today each form re-implements these from scratch. The library eliminates the duplication and gives every form a consistent look and behavior. The two existing Form Hub forms — Weekly Project Log and Vendor Payment — also get updated to use it.

### B. Coach Log moves to the Form Hub
The Coach Log Form, which today lives in its own standalone app, gets migrated into the Form Hub and rewritten to be cleaner and easier to use. The new form replaces five sequential "Did you do X today?" questions with one activity picker, only shows the coaching-cycle wrap-up section when it's actually relevant, and reorganizes the NYC-program questions.

### C. Date selection tied to logistics boards
Today, a coach picks any date from a calendar — which means logs can record a session that doesn't actually exist on the project's logistics board (mismatch between what was logged and what was planned). The new form changes the flow: the coach picks themselves (auto from auth) → project → site, and the date dropdown only shows session dates that exist on that project's logistics board. The data comes from Monday: a master board lists projects with their logistics board IDs; each project's logistics board holds the actual session dates. The goal is to eliminate mismatches between logs and logistics.

### D. CRD on submissions
Coaches can view their own submission history and delete a submission they made by mistake, without needing to go into Monday or ask ops. (Editing a submission is intentionally not in v1: to fix a mistake, the coach deletes and re-submits.)

### E. Reset the Monday Coach Log board
Because the new form has a different structure and writes to Supabase first, the existing Monday Coach Log board needs to be reset. The old board is archived for historical reference; a fresh board (or cleaned version of the existing one) becomes the live destination for new submissions. The program team needs to be looped in early so they know when the switch happens and where their historical data lives.

### F. Participant Roster Form (replaces the existing Google Form)
Coaches currently use a Google Form to add coachees to the Coaching Participant Roster Monday board. The new Form Hub version replaces that Google Form with a native form built on the same library and authentication patterns as the rest of the hub. Same coachee data ends up in the same Monday roster board — but with one consistent UX across all TL forms, and no double-handling between Google Forms and Monday.

---

## 2. What each item entails

### A. TL Question Library

**What gets built**
- Six field components: `TlSelect`, `TlMultiSelect`, `TlDateInput`, `TlTextInput`, `TlNumberInput`, `TlTextarea`. Each is a thin wrapper around the matching Mantine component, with TL conventions baked in (required-field asterisk, error styling, label-above-field).
- One pattern component: `RepeatableRowWidget`, the generalized "add row / remove row" pattern. Today it's implemented separately in `project-logs-widget.tsx` and `vendor-payment-widget.tsx`.

**Definition of done**
- Library lives at `app/components/library/` in the Form Hub.
- Both existing forms (Weekly Project Log, Vendor Payment) have been refactored to use the library.
- No behavior changes — existing forms work exactly as before, just on top of the library.

**Why this matters.** Building the library against three real forms (the two existing + Coach Log) is what proves the abstraction is right. Building it against Coach Log alone would yield a brittle API.

### B. Coach Log migration

**New form lives at** `/coach-log` in the Form Hub. Authentication is Supabase Google OAuth, restricted to `@teachinglab.org` emails — same model as the other hub forms.

**UX redesign decisions (vs. today)**
- **Activity picker** replaces five separate "Did you do X today?" questions. Coaches check the activities they did this session; only checked activities render their detail sections.
- **Cycle wrap-up is deferred**: each 1:1 row gets a single "Final session?" toggle. If any row is marked final, a single wrap-up section appears at the bottom — instead of an inline block under every Teacher coachee.
- **NYC sections** render only when the district is a NYC DOE district. Inside, exactly one panel — NYC Reads, NYC Solves, NYC Early Childhood, or MTSS Pilot — renders based on the program. Conditional depth drops from three layers to one.
- **EOY reflection** (open decision, Week 4): keep as a top-level section in the main form, or split into a separate route. Default if undecided: keep as section.
- **Missed/cancelled sessions** behave the same as today.

**Behind the scenes**
- Submissions write directly to the Coach Log Monday board. Monday is the single source of truth. Manual edits to Monday by program team (corrections, review status, etc.) are first-class and never drift. If the Monday write fails on submission, the form shows an error and the coach retries.
- The district/school list continues to come from the existing Google Sheet(or Monday), read via a Remix loader.
- Micro PL file uploads introduce a new pattern in the hub (no existing form has file upload). Spiked early to de-risk.

### C. Date selection tied to logistics boards

**What gets built**
- TBD based on how and where the session dates get stored per project

**Definition of done**
- A coach can only log a session against a (project, site, date) combination that exists on a real logistics board.
- Date dropdown is empty until project + site are selected; once selected, it shows only valid logistics dates.
- Show all dates when there are no date restricitons

### D. CRD on submissions

- **Create**: the form submission itself (covered by item B). Writes directly to the Coach Log Monday board.
- **Read**: a "My Submissions" page (`/coach-log/history`) queries Monday filtered by the coach's email/employee_id. Paginated (default: last 30 days; "Load more" for older). List view caches briefly on the client to keep navigation snappy.
- **Delete**: a Delete button calls Monday's `archive_item` — soft-delete equivalent that keeps the record in Monday's archive but hides it from active views. Optimistic UI: the row disappears immediately; if the Monday call fails, the row reappears with an error.


### E. Monday board reset

- **Archive + new board**: existing board becomes read-only (renamed "Coach Log Form — Archived"). A fresh board with the new column structure becomes the live target. Cleanest history boundary.

**Work involved either way**
- Design the new board's column structure to match the new form. Lock column IDs by Week 3 so the Monday sync code can reference them.
- Coordinate with program team: when the reset happens, what they need to save before then, where historical data lives afterward.

### F. Participant Roster Form

**What gets built**
- A new form at `/participant-roster` in the Form Hub.
- Same authentication as other hub forms (Supabase Google OAuth, `@teachinglab.org`).
- Collects coachee information (name, role, district, school, plus any other fields the current Google Form captures — schema confirmed in Week 5).
- Submission writes directly to the Coaching Participant Roster Monday board (the same board that the Coach Log Form's coachee dropdown reads from via `getTeacherInfo`).
- Uses TL library components: `TlSelect`, `TlTextInput`, `RepeatableRowWidget` for adding multiple coachees in one submission.

**Definition of done**
- Form replaces the existing Google Form as the way coaches add coachees to the roster.
- Coachee data lands in the Monday roster board in the right shape (new entries are picked up automatically by the Coach Log Form's dropdown).
- Old Google Form link is retired / redirected on cutover day.

**Scope and architecture**
- **No CRD on roster submissions in v1.** Once a coachee is added, the record lives in Monday and is managed there.
- **No Supabase table needed.** Direct Monday write only — the form is a thin UI over the Monday API.
- **Simpler than Coach Log** — no conditional sections, no NYC variations, no per-row wrap-ups. Estimated ~3 working days once the library is ready.

---

## 3. Timeline to launch

**Working assumption:** mid-level engineer at ~4 productive days/week, ~6 focused hours/day = **~24–26 hours/week of dev time**. The rest of each week absorbs meetings, code review, ops/admin, and context switching. Estimates below cover dev work only — comms hours are bundled in where they fall (see also Comms timeline).

| Week | Dates | Focus | Hours | Done by end of week |
|---|---|---|---|---|
| 1 | May 21 – May 27 | Library v1 + retrofit existing forms + Q1/Q2 spike | **~30h** | Library lives at `app/components/library/`; both Weekly Project Log + Vendor Payment use it with zero regressions; Q2 (TL email check) answered. + Q1 confirm FY27 question list |
| 2 | May 28 – Jun 3 | Monday board structure redesign + Coach Log scaffold; identity section (coach → project → site → date); Q3 + Q4 scoped; Monday reset + NYC gating decisions | **~20h** | create a new Monday board based on requested questions. `coachLog` domain (Monday client + mappers) + route stubs. Form renders identity section + activity picker. Q3 answered: master/logistics board structure documented. Reset approach locked in with program team. NYC gating signal decided. |
| 3 | Jun 4 – Jun 10 | Core activities + Monday write wired + new board columns locked + file upload spike | **~20h** | Coach can submit a basic (non-NYC) session end-to-end, writing directly to Monday. 1:1 coaching widget + group-activity widget functional. New Monday board column structure locked. Q1 (FY27 tiger copy) answered so NYC scope is clear. |
| 4 | Jun 11 – Jun 17 | NYC Reads + EOY decision + Q4 decision | **~20h** | NYC section orchestrator + NYC Reads panel fully working. EOY direction decided. Q4 (district/school location for FY27) decided. |
| 5 | Jun 18 – Jun 24 | NYC Solves + NYC Early Childhood + MTSS Pilot + Roster Form schema confirmed | **~20h** | All four NYC panels renderable; a NYC coach can complete a full submission. Current Google Roster Form fields documented (prep for Week 6). |
| 6 | Jun 25 – Jul 1 | Cycle wrap-up + missed session + file upload finish + district/school source wiring + **Participant Roster Form** | **~25h** | Coach Log at feature-parity with the old form. Roster Form live (writes to Monday roster board). District/school sourcing wired per Q4 outcome (Google Sheet loader OR Monday managed column read). |
| 7 | Jul 2 – Jul 8 | CRD layer (Monday-direct) + internal soft-QA pass | **~25h** | "My Submissions" page (paginated, client-cached) reads from Monday; delete via Monday `archive_item` with optimistic UI. Self-QA finds the obvious bugs before formal testers see them. (Lighter week — natural buffer for any Week 4–6 slippage.) |
| 8 | Jul 9 – Jul 15 | Internal QA + bug fix + comms prep + Monday board prep | **~15h** | Internal bug list near zero. ~5–8 testers recruited and confirmed (across NYC/non-NYC, FTE/PTE). Recruitment email sent, instructions + FAQ written, feedback channel set up. New Monday board prepared with FY27 column structure. |
| 9 | Jul 16 – Jul 22 | Formal testing — Week 1 (tester onboarding, daily triage, bug fixes) | **~15h** | Tester onboarding email Monday morning. Bugs triaged daily; urgent ones fixed same day. Mid-week check-in sent Wednesday. |
| 10 | Jul 23 – Aug 1 | Formal testing — Week 2 + Monday reset + cutover | **~15h** | Final fixes Thu Jul 30. Pre-launch announcement Thu Jul 30. Monday board archive + new board switchover Thu Jul 30 or Fri Aug 1 morning. **Cutover Fri Aug 1**: new form live; old `tl-coach-log-form` repo archived; old Google Roster Form retired. |

**Total: ~190 hours of focused dev time across 10 weeks.**

### Comms timeline

| When | Comm | Audience |
|---|---|---|
| Week 7 (Jul 2–8) | Informally identify tester candidates (incl. tester for the roster form) | Ops |
| Week 8 (Jul 9–10) | Recruitment email to candidates | Tester candidates |
| Week 8 (Jul 11–15) | Confirmation + scheduling | Confirmed testers |
| **Week 9 Mon (Jul 16)** | **Tester onboarding email + form link** | Testers |
| Week 9 Wed (Jul 18) | Mid-week check-in | Testers |
| Week 10 Mon (Jul 23) | Week-2 reminder | Testers |
| Week 10 Wed (Jul 29) | Final wrap-up + thank-you | Testers |
| Week 10 Thu (Jul 30) | Final confirmation of Monday reset timing | Program team |
| **Week 10 Thu (Jul 30)** | **Pre-launch announcement** | All coaches |
| **Week 10 Fri (Aug 1)** | **Launch announcement** (Coach Log + new Roster Form; old Google Form retired) | All coaches |
| Week +1 (Aug 4–8) | Post-launch feedback follow-up | All coaches |

### Phase boundaries (firm)

- **End of Week 1 (May 27):** Library done and both existing forms using it without regressions. If not, narrow library scope (drop least-used wrappers) but keep the retrofit. Do NOT proceed to Coach Log on an unproven library.
- **End of Week 3 (Jun 10):** Non-NYC submission works end-to-end. If not, NYC and CRD scope is at risk.
- **End of Week 6 (Jul 1):** Feature-parity with old form. If not, push CRD to post-launch and ship migration alone.
- **End of Week 8 (Jul 15):** Internal QA done, testers recruited. If testers aren't lined up, push cutover by a week.
- **End of Week 10 / Aug 1:** Cutover. If bug rate from testing is still high, slide by 1 week rather than ship broken.

### Scope cuts if behind (in this order)

1. CRD list view (deletion via ops request only)
2. Admin sync-health page (replaced by manual Supabase query)
3. MTSS Pilot panel (keep on old form temporarily)
4. NYC Early Childhood panel (same)

**Never cut:** NYC Reads, NYC Solves, file upload, basic submission flow, soft delete, library retrofit of existing forms.

---

## 4. Open questions

| # | Question | Resolve by |
|---|---|---|
| Q1 | **What questions does the FY27 tiger copy include?** We need to lock the question set for the Aug 1 release — including whether the EOY (End-of-Year) reflection questions stay in the form for FY27 or get dropped. This determines the scope of what gets built in Weeks 4–6 (NYC sections and EOY placement). | Week 3 |
| Q2 | Do all current coaches who fill out the Coach Log Form have `@teachinglab.org` emails? Determines whether the Supabase OAuth gate in the hub locks anyone out at cutover. | Week 1 |
| Q3 | **Where on the project's logistics board are session dates stored?** Need the board structure for at least one example project — specifically: are session dates stored as items (and which column holds the date)? As subitems? As entries on a calendar/timeline column? Also: how does the master board map project → logistics board ID (column name + format)? Without this, item C (date selection tied to logistics boards) can't be built. | Week 2 |
| Q4 | **Where should the district + school list live for FY27?** Today it's in a Google Sheet (`FY26 School/District Selection for Sites`) that L&R maintains by hand and the form reads via a server credential. For FY27, would it make more sense to host this as a managed column on a Monday board — keeps district and site selection consistent across Monday, and removes the Google Sheets credential dependency from the hub. Affects the Roster Form (item F) and any residual district/school selection that survives item C. | Week 4 |

---

## 5. Top risks

- **Week 1 is the tightest week.** Six field wrappers + RepeatableRowWidget + retrofit two forms + Q1 spike in one week is aggressive. If it slips, accept a 1-week slide (cutover → Aug 8) or narrow library scope (drop least-used wrappers like `TlNumberInput` or `TlTextarea` and use Mantine raw in Coach Log for those).
- **NYC sections (Weeks 4–5)** are the biggest single-feature risk. NYC Reads alone is ~880 lines of conditional logic in the current code. Start with a UI mockup, not code.
- **Monday board reset coordination.** If program team has dashboards or automations on the existing board, the reset may require rework on their side. Discover in Week 2, not on Aug 1.
- **Tester engagement.** Two weeks of testing is only useful if testers actually submit. Recruit one extra (target 7 confirmed for 5 active); keep the ask small and concrete in the recruitment email.
- **Week 6 is now busier** with the Roster Form added alongside cycle wrap-up + missed session + file upload + Sheets loader. If anything in Week 6 slips, the Roster Form is the safest item to push into Week 7 (since it has no dependencies on the Coach Log internals).
- **Monday read performance for the list view** ("My Submissions"). Reads go directly to Monday (~500ms–2s per page). Tolerable for v1, but if it's painfully slow at peak times the answer is to add a Supabase read-cache later — not in scope for Aug 1.
- **Logistics board dependency (item C).** The new date-selection flow assumes logistics boards are structured consistently across projects. If they aren't (some projects use a calendar column, some use subitems, some don't track dates at all), the implementation gets more complex. Mitigation: confirm structure in Week 2 via Q3; if non-uniform, fall back to a free-date input for projects without logistics boards.

---

## 6. After 2026-08-01 (backlog, not in scope)

- Update flow (CRUD's "U") if delete-and-re-submit proves annoying.
- Supabase read-cache for the "My Submissions" list view if Monday read latency or rate limits become a problem in practice.
- **Extract the TL Question Library into its own publishable package** (GitHub Packages or similar) when a second downstream consumer (another internal TL app) needs it. For v1 the library lives inside the form hub repo because the dev-loop friction of publishing every iteration during the retrofit isn't worth paying for one consumer.
- **Migrate the hub from Mantine to shadcn/ui** as a dedicated 3–4 week workstream. Mantine is fine for v1; shadcn is preferred long-term but isn't worth wedging into the Aug 1 timeline. When this happens, also swap `@mantine/form` for `react-hook-form` + `zod`, `@mantine/notifications` for `<Sonner>`/`<Toast>`, and `@mantine/dates` for the shadcn DayPicker-based date input.
- Framework upgrade: Remix v2 → React Router v7.
