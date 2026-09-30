import { Paper } from "@mantine/core";
import { useHoldProgressBar } from "~/components/navigation/navigation-progress";
import { cn } from "~/utils/utils";
import { FormPage, type FormWidth } from "./form-layout";

interface FormSkeletonProps {
  // Read out to screen readers; the placeholder blocks themselves are hidden
  message?: string;
  rows?: number;
  // Match the real form's FormPage width
  width?: FormWidth;
  // Reserve space for the reminders banner above the card
  withReminders?: boolean;
}

const Bar = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "rounded-md bg-gray-200 dark:bg-white/10 animate-pulse motion-reduce:animate-none",
      className
    )}
  />
);

// Placeholder shaped like the forms' card, shown while the session or form
// data resolves. It uses the same FormPage wrapper and card surface as the
// forms, so the page holds its layout (no full-screen spinner, no jump when the
// real form swaps in) and reads as loaded.
export const FormSkeleton = ({
  message = "Loading…",
  rows = 5,
  width = "md",
  withReminders = false,
}: FormSkeletonProps) => {
  // Client-side data fetches don't show in useNavigation(), so keep the
  // app's top progress bar running while the skeleton is up
  useHoldProgressBar();
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{message}</span>
      <FormPage width={width}>
        {withReminders && (
          <Paper withBorder aria-hidden="true" className="p-5 flex flex-col gap-3">
            <Bar className="h-5 w-1/4" />
            <Bar className="h-4 w-3/4" />
          </Paper>
        )}
        <Paper
          withBorder
          shadow="xl"
          aria-hidden="true"
          className="p-5 sm:p-8 flex flex-col gap-6"
        >
          <Bar className="h-8 w-2/5" />
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Bar className="h-4 w-1/3" />
              <Bar className="h-9 w-full" />
            </div>
          ))}
          <div className="flex justify-end">
            <Bar className="h-9 w-28" />
          </div>
        </Paper>
      </FormPage>
    </div>
  );
};
