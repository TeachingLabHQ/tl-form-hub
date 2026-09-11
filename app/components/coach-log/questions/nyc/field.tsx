import { Text } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  label: string;
  /** Optional helper/guidance text shown under the label. */
  note?: ReactNode;
  children: ReactNode;
};

/**
 * Standard label + optional note + input wrapper for the (numerous) NYC Reads
 * and Solves questions, so each question reads as a single declarative block.
 */
export const QuestionField = ({ label, note, children }: Props) => (
  <div className="flex flex-col gap-1">
    <h1 className="font-medium text-lg">{label}</h1>
    {note ? (
      <Text size="sm" c="white">
        {note}
      </Text>
    ) : null}
    {children}
  </div>
);

type TouchpointSectionProps = {
  /** The exact touchpoint-type option this section's questions belong to, so
   * the heading matches what the coach checked above. */
  title: string;
  children: ReactNode;
};

/**
 * Groups a touchpoint's questions under a labeled card so it's clear which
 * questions belong to which selected touchpoint type when several are
 * checked at once (touchpoint type is a multi-select).
 */
export const TouchpointSection = ({ title, children }: TouchpointSectionProps) => (
  <div className="flex flex-col gap-4 rounded-2xl bg-white/10 p-4">
    <h2 className="font-semibold text-xl">{title}</h2>
    {children}
  </div>
);
