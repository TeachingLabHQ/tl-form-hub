import { Paper, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import { cn } from "~/utils/utils";

export type FormWidth = "md" | "lg";

// md fits single-column question forms; lg fits the multi-column row widgets
// (project log, vendor payment)
const WIDTHS: Record<FormWidth, string> = {
  md: "max-w-[720px]",
  lg: "max-w-5xl",
};

// Card padding, shared with FormActions so its sticky bar can bleed to the
// card's edges
const CARD_PADDING = "p-5 sm:p-8";

/**
 * Page wrapper for a form route: a centered column over the background photo.
 * min-h-screen keeps the footer below the fold while data loads (FormSkeleton
 * uses the same wrapper, so the swap doesn't shift layout).
 */
export const FormPage = ({
  width = "md",
  className,
  children,
}: {
  width?: FormWidth;
  className?: string;
  children: ReactNode;
}) => (
  <div className="min-h-screen w-full px-4 py-8 md:py-12">
    <div className={cn("mx-auto flex flex-col gap-6", WIDTHS[width], className)}>
      {children}
    </div>
  </div>
);

/** The solid surface a form sits on, with an optional title and intro. */
export const FormCard = ({
  title,
  description,
  className,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
  children: ReactNode;
}) => (
  <Paper
    withBorder
    shadow="xl"
    className={cn(CARD_PADDING, "flex flex-col gap-6", className)}
  >
    {(title || description) && (
      <div className="flex flex-col gap-2">
        {title && <Title order={2}>{title}</Title>}
        {description && (
          <Text c="dimmed" className="flex flex-col gap-2">
            {description}
          </Text>
        )}
      </div>
    )}
    {children}
  </Paper>
);

/**
 * A titled group of questions. The optional step number gives long, branching
 * forms a sense of progress without a wizard.
 */
export const FormSection = ({
  step,
  title,
  description,
  className,
  children,
}: {
  step?: number;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  children: ReactNode;
}) => (
  <section className={cn("flex flex-col gap-4", className)}>
    <div className="flex items-center gap-3 border-b border-[var(--mantine-color-default-border)] pb-3">
      {step !== undefined && (
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--mantine-primary-color-light)] text-sm font-semibold text-[var(--mantine-primary-color-light-color)]"
        >
          {step}
        </span>
      )}
      <div className="flex flex-col">
        <Title order={3} size="h4">
          {title}
        </Title>
        {description && (
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        )}
      </div>
    </div>
    {children}
  </section>
);

/**
 * Submit bar pinned to the bottom of the viewport while the card is taller
 * than the screen, so long forms can be submitted without scrolling back.
 * `summary` sits on the left (e.g. a running total).
 */
export const FormActions = ({
  summary,
  children,
}: {
  summary?: ReactNode;
  children: ReactNode;
}) => (
  <div
    className={cn(
      // Negative margins cancel the card padding so the bar spans the card
      "sticky bottom-0 z-10 -mx-5 -mb-5 sm:-mx-8 sm:-mb-8 px-5 sm:px-8 py-4",
      "flex flex-wrap items-center justify-between gap-4",
      "rounded-b-[var(--mantine-radius-lg)] border-t border-[var(--mantine-color-default-border)]",
      "bg-[var(--mantine-color-body)] shadow-[0_-8px_16px_-12px_rgba(0,0,0,0.25)]"
    )}
  >
    <div className="min-w-0">{summary}</div>
    <div className="flex items-center gap-3">{children}</div>
  </div>
);

/** Wraps a conditionally shown block so it fades in when it appears. */
export const Reveal = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col gap-4 animate-fade-in motion-reduce:animate-none">
    {children}
  </div>
);
