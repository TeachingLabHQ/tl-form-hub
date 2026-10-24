import { Notification } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconX } from "@tabler/icons-react";
import { useState } from "react";
import { formatRange } from "~/domains/contractor-availability/availability";
import type { NewBookout } from "~/domains/contractor-availability/model";
import { FormSkeleton } from "~/components/form-kit";
import { BookoutCalendar } from "./bookout-calendar";
import { BookoutModal } from "./bookout-modal";
import { useContractorAvailability } from "./hooks/use-contractor-availability";
import { ProfileForm } from "./profile-form";
import { UpcomingBookouts } from "./upcoming-bookouts";

/**
 * A contractor's own page. What's coming up and booking out are the frequent
 * jobs, so the calendar and upcoming list lead; the GAP, confirmed about once a
 * quarter, sits beside them (and after them on phones).
 */
export const MyAvailability = ({ email }: { email: string }) => {
  const { contractor, loading, loadError, saveProfile, addBookout, removeBookout } =
    useContractorAvailability(email);
  const [modalDay, setModalDay] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  if (loading && !contractor) return <FormSkeleton message="Loading your availability…" rows={6} />;
  if (!contractor) {
    return (
      <Notification
        icon={<IconX size={20} />}
        color="red"
        title={
          loadError === "Contractor not found"
            ? `We couldn't find ${email} among active contractors on the Coach/Facilitator Details board.`
            : "Something went wrong loading your availability. Please try again or contact the technology team."
        }
        withCloseButton={false}
      />
    );
  }

  const submitBookout = async (bookout: NewBookout) => {
    const error = await addBookout(bookout);
    if (!error) {
      notifications.show({
        color: "teal",
        title: `Saved ${formatRange(bookout.start, bookout.end)}`,
        message: "Staffing sees it now.",
      });
    }
    return error;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-5 items-start">
      <div className="flex flex-col gap-5 min-w-0">
        <BookoutCalendar
          profile={contractor.profile}
          bookouts={contractor.bookouts}
          onAdd={(day) => {
            setModalDay(day);
            setModalOpen(true);
          }}
        />
        <UpcomingBookouts bookouts={contractor.bookouts} onRemove={removeBookout} />
      </div>
      {/* Remount on contractor change so the form picks up their saved values */}
      <ProfileForm key={contractor.email} contractor={contractor} onSave={saveProfile} />
      <BookoutModal
        opened={modalOpen}
        startDay={modalDay}
        onClose={() => setModalOpen(false)}
        onSubmit={submitBookout}
      />
    </div>
  );
};
