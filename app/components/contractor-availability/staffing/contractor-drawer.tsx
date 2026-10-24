import { Badge, Button, Drawer, Group, Textarea } from "@mantine/core";
import { useEffect, useState } from "react";
import {
  bookoutsByRelevance,
  formatRange,
  monthlyTarget,
  tlDaysInMonth,
  todayIso,
  todayIsoEastern,
  SEASON_LABELS,
  seasonOf,
  TRAVEL_REACH_LABELS,
  travelReach,
} from "~/domains/contractor-availability/availability";
import {
  type Contractor,
  bookoutTypeLabel,
  MONTH_LABELS,
  STATES,
} from "~/domains/contractor-availability/model";
import { SESSION_PORTION_NOTE } from "~/domains/contractor-availability/sessions";
import { BOOKOUT_COLORS, FIELD_CLASSES } from "../constants";
import { GapHistory } from "../gap-history";
import { ProfileAgeBadge } from "../profile-form";

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <>
    <dt className="text-white/80">{label}</dt>
    <dd className="m-0">{children}</dd>
  </>
);

// Internal notes for staffing; the contractor never sees these
const StaffNotes = ({
  contractor,
  onSave,
}: {
  contractor: Contractor;
  onSave: (email: string, notes: string) => Promise<string | null>;
}) => {
  const [notes, setNotes] = useState(contractor.staffNotes);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  useEffect(() => {
    setNotes(contractor.staffNotes);
    setMessage(null);
  }, [contractor.email, contractor.staffNotes]);

  const save = async () => {
    setSaving(true);
    const error = await onSave(contractor.email, notes);
    setSaving(false);
    setMessage(error ? { error: true, text: error } : { error: false, text: "Saved." });
  };

  return (
    <section>
      <h3 className="font-semibold mb-1">Internal staffing notes</h3>
      <p className="text-xs text-white/90 mb-2">Visible to Teaching Lab staff only, not to the contractor.</p>
      <Textarea
        aria-label="Internal staffing notes"
        classNames={FIELD_CLASSES}
        autosize
        minRows={3}
        maxLength={5000}
        value={notes}
        onChange={(e) => {
          setNotes(e.currentTarget.value);
          setMessage(null);
        }}
      />
      <Group gap="sm" mt="xs">
        <Button
          size="xs"
          color="white"
          c="#082040"
          loading={saving}
          disabled={notes.trim() === contractor.staffNotes}
          onClick={save}
          className="disabled:bg-white/20 disabled:text-white/80"
        >
          Save notes
        </Button>
        {message && (
          <span className={message.error ? "text-xs text-red-300" : "text-xs text-emerald-300"}>{message.text}</span>
        )}
      </Group>
    </section>
  );
};

/** One contractor's full record for staffing: profile, monthly load, bookouts, notes. */
export const ContractorDrawer = ({
  contractor,
  onClose,
  onSaveStaffNotes,
  onViewed,
}: {
  contractor: Contractor | null;
  onClose: () => void;
  onSaveStaffNotes: (email: string, notes: string) => Promise<string | null>;
  onViewed: (email: string) => void;
}) => {
  const c = contractor;

  // Opening someone stamps "last viewed by staff" on their page, once a day
  useEffect(() => {
    if (c?.profileItemId && c.staffViewedOn !== todayIsoEastern()) onViewed(c.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per contractor opened
  }, [c?.email]);
  const today = todayIso();
  const now = new Date();
  const months = [0, 1, 2].map((i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  return (
    // Navy like the page card, so the drawer reads as part of the same page
    <Drawer
      opened={!!c}
      onClose={onClose}
      position="right"
      size="lg"
      title={c?.name}
      classNames={{
        content: "bg-[#082040] text-white shadow-[inset_1px_0_0_rgba(255,255,255,0.25)]",
        header: "bg-[#082040] text-white border-b border-white/15",
        title: "text-xl font-semibold",
        close: "text-white hover:bg-white/15",
      }}
    >
      {c && (
        <div className="flex flex-col gap-5 text-sm">
          <div>
            <p className="text-sm text-white/90 pt-3">
              {[c.city, STATES[c.state]?.name, c.timeZone].filter(Boolean).join(" · ")} · {c.email}
            </p>
            <Group gap="xs" mt="xs">
              {c.profileSource === "intake" ? (
                <Badge tt="none" color="yellow.4" autoContrast>Onboarding answers only</Badge>
              ) : (
                <ProfileAgeBadge profile={c.profile} />
              )}
              <Badge tt="none" color="white" c="#082040">{TRAVEL_REACH_LABELS[travelReach(c.profile)]}</Badge>
              {c.profile.support.map((s) => (
                <Badge tt="none" key={s} color="blue.8">
                  {s}
                </Badge>
              ))}
            </Group>
          </div>

          <section>
            <h3 className="font-semibold mb-2">Availability profile</h3>
            <dl className="grid grid-cols-[140px_minmax(0,1fr)] gap-x-3 gap-y-1.5">
              <Row label="Travel">
                {TRAVEL_REACH_LABELS[travelReach(c.profile)]}
                {travelReach(c.profile) === "regional" ? ` (${c.profile.regions.join(", ") || "no regions set"})` : ""}
                {c.profile.longestTrip ? ` · ${c.profile.longestTrip.toLowerCase()}` : ""}
              </Row>
              <Row label="Usual days">{c.profile.weekdays.join(", ") || "Any weekday"}</Row>
              <Row label="Stated capacity">
                {c.profile.daysPerWeek ? `${c.profile.daysPerWeek} days/week` : "Not set"}
                {c.profile.maxDaysPerMonth ? `, max ${c.profile.maxDaysPerMonth}/month` : ""}
              </Row>
              <Row label="Times of year">
                {seasonOf(c.profile.months) === "custom"
                  ? c.profile.months.map((m) => MONTH_LABELS[m]).join(", ")
                  : SEASON_LABELS[seasonOf(c.profile.months)]}
              </Row>
              <Row label="Outside workload">{c.profile.outsideWork || "Not set"}</Row>
              <Row label="Conflicts">{c.profile.conflicts || "None listed"}</Row>
              <Row label="Content areas">{c.contentAreas.join(", ") || "—"}</Row>
              <Row label="Notes">{c.profile.notes || "—"}</Row>
            </dl>
            <div className="mt-2">
              <GapHistory key={c.email} email={c.email} />
            </div>
          </section>

          <section>
            <h3 className="font-semibold mb-2">TL load by month</h3>
            <dl className="grid grid-cols-[140px_minmax(0,1fr)] gap-x-3 gap-y-1.5">
              {months.map(({ year, month }) => {
                const load = tlDaysInMonth(c.bookouts, year, month);
                const target = monthlyTarget(c.profile);
                return (
                  <Row key={`${year}-${month}`} label={`${MONTH_LABELS[month]} ${year}`}>
                    <span className="tabular-nums">
                      {load} {target ? `of ${target} days stated capacity` : "days"}
                    </span>
                  </Row>
                );
              })}
            </dl>
          </section>

          <section>
            <h3 className="font-semibold mb-2">Every logged bookout</h3>
            {c.bookouts.length === 0 ? (
              <p className="text-white/90">None logged.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-white/15 max-h-72 overflow-y-auto">
                {bookoutsByRelevance(c.bookouts, today).map((b) => (
                  <li
                    key={b.id}
                    className={`flex flex-wrap items-center gap-2 py-1.5 ${b.end < today ? "opacity-55" : ""}`}
                  >
                    <span className="min-w-[110px] font-medium tabular-nums">{formatRange(b.start, b.end)}</span>
                    <Badge tt="none" size="sm" color={BOOKOUT_COLORS[b.type]}>
                      {bookoutTypeLabel(b.type)}
                    </Badge>
                    <span className="text-white/90">
                      {b.portion !== "Full day" ? `${b.portion} · ` : ""}
                      {b.note}
                    </span>
                    {b.source === "logistics" && (
                      <span className="text-xs text-white/90">From logistics board</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {c.bookouts.some((b) => b.source === "logistics") && (
              <p className="mt-2 text-xs text-white/90">{SESSION_PORTION_NOTE}</p>
            )}
          </section>

          <StaffNotes contractor={c} onSave={onSaveStaffNotes} />
        </div>
      )}
    </Drawer>
  );
};
