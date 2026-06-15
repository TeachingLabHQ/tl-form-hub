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
