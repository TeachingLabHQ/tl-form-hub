# TL Form Kit — Part A Implementation

**Branch:** `fix/impersonate-sarh` (working branch)
**Drafted:** 2026-05-27
**Scope:** Part A of `coach-log-migration-plan.md` — the shared form-building library plus retrofit of the two existing forms.

> Library folder lives at `app/components/form-kit/` (renamed from the earlier `question-library/` working name).

---

## 1. Design decisions (locked)

| Question | Decision |
|---|---|
| Build `TlSelect` / `TlDateInput` / `TlTextInput` / `TlNumberInput` / `TlTextarea` wrappers? | **No.** Walked back from the original migration plan. Each wrapper only added an optional `title` heading and forwarded the rest of the Mantine props verbatim — that's a six-line `<h1>` + `<flex-col>` pattern, not an abstraction worth maintaining. Forms use Mantine components directly. |
| Build `TlMultiSelect`? | **Deferred.** Neither existing form uses MultiSelect. Decide when Coach Log proves the real UX (multi-select dropdown vs. checkbox group vs. chip group). |
| `RepeatableRowWidget` API | **Render-prop.** Caller supplies `renderRow={(row, idx, ctx) => ...}` and an `emptyRow`. Library owns add/delete scaffolding and exposes `ctx.updateRow` / `ctx.deleteRow` / `ctx.canDelete`. Form owns grid layout, header columns, and delete-button placement. |
| Validation/error handling | Pass-through. Library has no opinion on validation state. Forms keep their existing `isValidated` pattern. |
| Totals (`totalWorkHours`) state shape | **Derived via `useMemo` from `rows`.** Removed the imperative `setTotalWorkHours` / `updateTotalWorkHours` plumbing that used to fire from inside `setRows`. Totals are now a pure function of the row array, which is what lets `ctx.updateRow` / `ctx.deleteRow` actually be used instead of bespoke `handleChange` / `handleDeleteRow` callbacks. |

**Net library surface: one component (`RepeatableRowWidget`).**

---

## 2. What changed

### Files added (`app/components/form-kit/`)

| File | Purpose |
|---|---|
| `index.ts` | Barrel export for `RepeatableRowWidget` and its types |
| `repeatable-row-widget.tsx` | Generic render-prop "add row / delete row" pattern |

### Files modified

| File | Change |
|---|---|
| `app/components/weekly-project-log/project-logs-widget.tsx` | Rewritten to use `RepeatableRowWidget`. `ctx.updateRow` used for all field changes, `ctx.deleteRow` for the delete button. No more `handleChange` / `handleDeleteRow`. **Intentional behavior change:** the Internal Admin / PTO → projectRole auto-fill was removed (no longer needed). |
| `app/components/weekly-project-log/project-log-form.tsx` | `totalWorkHours` switched from `useState` to `useMemo` derived from `projectWorkEntries`. `setTotalWorkHours` no longer passed to the widget. |
| `app/components/vendor-payment-form/vendor-payment-widget.tsx` | Rewritten to use `RepeatableRowWidget`. `ctx.updateRow` / `ctx.deleteRow` used directly. Per-row memo `Textarea` rendered as a sibling node below the grid `div` inside `renderRow`. |
| `app/components/vendor-payment-form/vendor-payment-form.tsx` | `totalWorkHours` switched to `useMemo`. `setTotalWorkHours` no longer passed to the widget. |
| `app/components/weekly-project-log/utils.tsx` | `updateTotalWorkHours` helper removed (was the imperative side-effect that bundled totals into `setRows` — now unnecessary since totals are derived). |

### Behavior changes

- **Intentional removal:** the Internal Admin / PTO → projectRole auto-fill in the Weekly Project Log was removed (no longer needed).
- Everything else preserved: same grid templates, same label styles, same error messages, same submission flow.

---

## 3. `RepeatableRowWidget` API reference

```tsx
<RepeatableRowWidget<RowType>
  rows={entries}                                // T[]
  setRows={setEntries}                          // Dispatch<SetStateAction<T[]>>
  emptyRow={{ ... }}                            // T — added on "Add Row" click
  minRows={1}                                   // delete hidden when length === minRows
  addRowLabel="Add New Row"                     // optional
  header={({ canDelete }) => <HeaderGrid />}    // ReactNode OR (ctx) => ReactNode
  renderRow={(row, index, ctx) => (
    // ctx = { updateRow, deleteRow, canDelete }
    <div className="grid grid-cols-[...]">
      <Select value={row.x} onChange={v => ctx.updateRow({ x: v })} ... />
      {ctx.canDelete && <DeleteButton onClick={ctx.deleteRow} />}
    </div>
  )}
/>
```

`ctx.updateRow` accepts a `Partial<T>` so multi-field patches work naturally — useful if a future form needs to derive one field from another at the same moment (e.g., setting two row fields atomically from a single onChange).

If a form needs side effects beyond a row mutation (e.g., a real async call), it should bypass `ctx.updateRow` and call `setRows` directly. Today neither retrofitted form needs that — totals are derived, not pushed.

---

## 4. Manual test checklist

Run `npm run dev` and open both forms in a browser. Sign in with a `@teachinglab.org` Google account.

### Weekly Project Log (`/weekly-project-log-form`)

#### Date picker
- [ ] Page loads with the closest Monday already selected.
- [ ] Click the date input — only Mondays are selectable (other days are greyed out).
- [ ] Pick a different Monday; the field updates.
- [ ] Submit without a date (clear the field first) → red "Date is required" error renders below the input.

#### Project rows
- [ ] First row renders with all five fields (Project Name, Project Role, Activity, Work Hours, Budgeted Hours).
- [ ] No delete button on the first row when it's the only row.
- [ ] Click "Add New Row" → a second row appears with empty fields.
- [ ] Both rows now show a delete (X) button on the right.
- [ ] Add a third row → still three delete buttons. Grid columns realign with the extra `0.5fr` column.
- [ ] Delete the middle row → totals re-compute (sidebar), remaining rows shift correctly.
- [ ] Delete one of two remaining rows → delete buttons disappear from the last remaining row.

#### Project Name / Role (auto-fill removed)
- [ ] Selecting "TL_Internal Admin" or "ZZ_PTO, Holidays, Approved Break, or Other Paid Leave" does NOT auto-set Project Role to "Other" — the field stays empty until the user picks a role themselves.
- [ ] The Project Role field is still controllable as a normal Select (search, type-ahead, etc.).

#### Selects
- [ ] Project Name dropdown is searchable (type to filter).
- [ ] Project Role dropdown is searchable.
- [ ] Activity dropdown shows the four activity options.
- [ ] Pressing Enter in any select doesn't submit the form (the `handleKeyDown` guard still works).

#### Work hours (regression check — totals are now derived)
- [ ] Number input rejects negative numbers.
- [ ] Number input rejects zero (you can type `0` but submit fails).
- [ ] Decimal values up to 2 places work (e.g., `1.25`).
- [ ] Total Time sidebar updates as you type in workHours across rows.
- [ ] Total Time updates immediately when you delete a row.
- [ ] Total Time updates when you add a new row (sidebar shouldn't jump unexpectedly).

#### Budgeted Hours
- [ ] Field is readonly; shows "N/A" by default.
- [ ] If you have pre-assigned projects from budgeted hours, those rows show the budgeted-hours value.

#### Comments textarea
- [ ] Bold "Do you have any additional comments?" heading renders above the textarea.
- [ ] You can type into the textarea.

#### Submit
- [ ] Submit with all fields filled → success notification appears.
- [ ] Submit with a missing required field → red error appears under that field, no submission.

#### Executive Assistant flow (if applicable)
- [ ] Sign in as an EA email (per `executiveAssistantMappings`).
- [ ] "Who are you submitting this form for?" selector appears at the top.
- [ ] Switch to executive → project data reloads for that executive.

### Vendor Payment (`/vendor-payment-form`)

#### Date picker
- [ ] Date field renders under the plain "Enter the date of the work" label.
- [ ] Disallowed dates (per `shouldExcludeVendorPaymentDate`) are greyed out.
- [ ] Submit without a date → "Date is required" error renders.

#### Payment rows
- [ ] First row renders with Task, Project, Work Hours, Rate (readonly), Total Pay (readonly), plus the memo textarea below.
- [ ] No delete button on the first row when it's the only row.
- [ ] Click "Add New Row" → a second row appears, both rows now show delete buttons.
- [ ] Delete the second row → delete buttons disappear from the remaining row.

#### Task / rate / total pay
- [ ] Task dropdown shows tasks filtered by your tier (or shows nothing if you have no tier).
- [ ] Selecting a task auto-fills the Rate cell with `$X.XX`.
- [ ] Typing hours auto-fills the Total Pay cell.
- [ ] Total Pay sidebar at the top updates as values change.
- [ ] If the task has a `maxHours`, NumberInput enforces it as the max.

#### Project select
- [ ] Project dropdown is searchable and filtered by `filterVendorPaymentProjects`.

#### Memo textarea
- [ ] Textarea is per-row (one memo per row).
- [ ] You can type up to 2000 characters.
- [ ] Character count `X/2000` renders below.

#### Submit (regression check — totals are now derived)
- [ ] Submit with all rows complete → success notification, form resets.
- [ ] Submit with missing required fields → "Please fill in all fields" error.
- [ ] Total work hours > 50 → blocks submit with the limit error (this validation reads the derived `totalWorkHours`, so make sure it still trips at the 50-hour threshold).

#### History tab
- [ ] Switch to "Submission History (Current Month)" tab → list renders, no library changes here but confirm it still works.

### Cross-form smoke tests
- [ ] Navigate between the two forms via the navbar.
- [ ] Refresh the page mid-form → form resets to defaults cleanly.
- [ ] No console errors in browser devtools on either form load or submit.

### Build hygiene
- [x] `npm run typecheck` clean.
- [x] `npm run build` clean.

---

## 5. Known non-changes (intentional)

- `Reminders`, the `Total Time` / `Total Pay` sidebar, and the white/30 form container styling are **not** moved into the library. They live in form code as before.
- The Executive Assistant selector is **not** moved into the library (form-specific).
- The `isValidated` / `isSubmitted` / `isSuccessful` state pattern remains form-owned.
- Mantine version (`@mantine/core@^7.17.7`) unchanged. Mantine `Select`, `DateInput`, `TextInput`, `NumberInput`, `Textarea` are used directly by forms — no wrappers in between.

---

## 6. Note: divergence from `coach-log-migration-plan.md`

The original migration plan (Section 2.A) called for six field wrappers (`TlSelect`, `TlMultiSelect`, `TlDateInput`, `TlTextInput`, `TlNumberInput`, `TlTextarea`) plus the row widget, under a folder called `library/`. After scaffolding the wrappers and looking at them in context, two changes were made:

1. **No field wrappers.** Each wrapper added so little value over the raw Mantine component that it wasn't worth the indirection.
2. **Folder renamed** to `form-kit/` (the working name `question-library/` was felt to be too generic-by-implication and didn't match the narrower scope).

`coach-log-migration-plan.md` Section 2.A should be updated to reflect: library is `form-kit/` with one component (`RepeatableRowWidget`), not six wrappers + one pattern.

---

## 7. Next steps (Part B onward)

When Coach Log work introduces new field types not in the existing forms, evaluate whether each one deserves a library component on its own merits. Specifically:

- **Activity picker** (replaces five sequential yes/no questions): likely a `CheckboxGroup`. If the styling is non-trivial or the same pattern shows up in the Roster Form, that's worth library-izing.
- **"Final session?" toggle:** likely Mantine `Switch` raw — no wrapper needed.
- **Micro PL file upload:** entirely new pattern. Build it in the library if the design is non-trivial and reusable across Coach Log + Roster Form.

Rule of thumb: a component earns a library slot if it (a) appears in two or more forms with the same shape, OR (b) bakes in non-trivial behavior beyond what the raw Mantine component provides. The Tl* field wrappers in this round did neither; `RepeatableRowWidget` does (a) and lets totals stay derived, which is both.
