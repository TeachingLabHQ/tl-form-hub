import { Badge, Button, Drawer, Group, Text, Textarea } from "@mantine/core";
import { useEffect, useState } from "react";
import {
  formatRange,
  monthlyTarget,
  tlDaysInMonth,
  todayIso,
  TRAVEL_REACH_LABELS,
  travelReach,
} from "~/domains/contractor-availability/availability";
import {
  type Contractor,
  bookoutTypeLabel,
  MONTH_LABELS,
  STATES,
  TRAVEL_FORMATS,
} from "~/domains/contractor-availability/model";
import { BOOKOUT_COLORS } from "../constants";
import { ProfileAgeBadge } from "../profile-form";

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <>
    <dt className="text-gray-500">{label}</dt>
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
      <Text size="xs" c="dimmed" mb="xs">
        Visible to Teaching Lab staff only, not to the contractor.
      </Text>
      <Textarea
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
        <Button size="xs" loading={saving} disabled={notes.trim() === contractor.staffNotes} onClick={save}>
          Save notes
        </Button>
        {message && (
          <Text size="xs" c={message.error ? "red" : "green"}>
            {message.text}
          </Text>
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
}: {
  contractor: Contractor | null;
  onClose: () => void;
  onSaveStaffNotes: (email: string, notes: string) => Promise<string | null>;
}) => {
  const c = contractor;
  const today = todayIso();
  const now = new Date();
  const months = [0, 1, 2].map((i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  return (
    <Drawer opened={!!c} onClose={onClose} position="right" size="lg" title={c?.name}>
      {c && (
        <div className="flex flex-col gap-5 text-sm">
          <div>
            <Text size="sm" c="dimmed">
              {[c.city, STATES[c.state]?.name, c.timeZone].filter(Boolean).join(" · ")} · {c.email}
            </Text>
            <Group gap="xs" mt="xs">
              {c.profileSource === "intake" ? (
                <Badge color="yellow">Onboarding answers only</Badge>
              ) : (
                <ProfileAgeBadge profile={c.profile} />
              )}
              <Badge color="gray">{TRAVEL_REACH_LABELS[travelReach(c.profile)]}</Badge>
              {c.profile.support.map((s) => (
                <Badge key={s} color="blue" variant="light">
                  {s}
                </Badge>
              ))}
            </Group>
          </div>

          <section>
            <h3 className="font-semibold mb-2">Availability profile</h3>
            <dl className="grid grid-cols-[140px_minmax(0,1fr)] gap-x-3 gap-y-1.5">
              <Row label="Formats">
                {c.profile.formats.map((f) => TRAVEL_FORMATS.find((t) => t.value === f)?.label).join("; ") || "—"}
              </Row>
              <Row label="Travels to">
                {c.profile.regions.join(", ") || "Home area only"}
                {c.profile.longestTrip ? ` · longest ${c.profile.longestTrip.toLowerCase()}` : ""}
              </Row>
              <Row label="Usual days">{c.profile.weekdays.join(", ") || "Any weekday"}</Row>
              <Row label="Target">
                {c.profile.daysPerWeek ? `${c.profile.daysPerWeek} days/week` : "Not set"}
                {c.profile.maxDaysPerMonth ? `, max ${c.profile.maxDaysPerMonth}/month` : ""}
              </Row>
              <Row label="Months">
                {c.profile.months.length === 0 || c.profile.months.length === 12
                  ? "Year-round"
                  : c.profile.months.map((m) => MONTH_LABELS[m]).join(", ")}
              </Row>
              <Row label="Other work">
                {c.profile.outsideWork || "Not set"}
                {c.profile.outsideHours ? ` · ${c.profile.outsideHours} h/wk` : ""}
              </Row>
              <Row label="Conflicts">{c.profile.conflicts || "None listed"}</Row>
              <Row label="Content areas">{c.contentAreas.join(", ") || "—"}</Row>
              <Row label="Notes">{c.profile.notes || "—"}</Row>
            </dl>
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
                      {load} {target ? `of ${target} target days` : "days"}
                    </span>
                  </Row>
                );
              })}
            </dl>
          </section>

          <section>
            <h3 className="font-semibold mb-2">Upcoming bookouts</h3>
            {c.bookouts.filter((b) => b.end >= today).length === 0 ? (
              <Text size="sm" c="dimmed">
                None logged.
              </Text>
            ) : (
              <ul className="flex flex-col divide-y">
                {c.bookouts
                  .filter((b) => b.end >= today)
                  .map((b) => (
                    <li key={b.id} className="flex flex-wrap items-center gap-2 py-1.5">
                      <span className="min-w-[110px] font-medium tabular-nums">{formatRange(b.start, b.end)}</span>
                      <Badge size="sm" color={BOOKOUT_COLORS[b.type]}>
                        {bookoutTypeLabel(b.type)}
                      </Badge>
                      <span className="text-gray-600">
                        {b.portion !== "Full day" ? `${b.portion} · ` : ""}
                        {b.note}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <StaffNotes contractor={c} onSave={onSaveStaffNotes} />
        </div>
      )}
    </Drawer>
  );
};
