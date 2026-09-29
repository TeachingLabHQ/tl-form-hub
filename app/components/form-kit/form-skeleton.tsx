import { cn } from "~/utils/utils";

interface FormSkeletonProps {
  // Read out to screen readers; the placeholder blocks themselves are hidden
  message?: string;
  rows?: number;
}

const Bar = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "rounded-md bg-white/40 animate-pulse motion-reduce:animate-none",
      className
    )}
  />
);

// Placeholder shaped like the forms' glass card, shown while the session or
// form data resolves. It holds the page layout in place (no full-screen
// spinner, no jump when the real form swaps in) so the page reads as loaded.
export const FormSkeleton = ({
  message = "Loading…",
  rows = 5,
}: FormSkeletonProps) => (
  <div
    // min-h-screen matches the form routes' wrappers, keeping the footer
    // below the fold so it doesn't jump when the real page swaps in
    className="min-h-screen w-full grid grid-cols-1 md:grid-cols-12 content-start gap-8 py-8 px-4 md:px-0"
    role="status"
    aria-busy="true"
  >
    <span className="sr-only">{message}</span>
    <div
      aria-hidden="true"
      className="col-span-1 md:col-start-2 md:col-span-10 h-fit p-8 rounded-[25px] bg-white/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] flex flex-col gap-6"
    >
      <Bar className="h-8 w-2/5" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Bar className="h-4 w-1/3" />
          <Bar className="h-9 w-full" />
        </div>
      ))}
      <Bar className="h-9 w-full bg-white/50" />
    </div>
  </div>
);
