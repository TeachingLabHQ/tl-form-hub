import { cn } from "~/utils/utils";
import { PANEL } from "./constants";

type Props = {
  title: React.ReactNode;
  // Small text or a badge beside the title
  meta?: React.ReactNode;
  // Buttons on the right of the header
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

/** A card on the glass page with a consistent header: title, meta, actions. */
export const Panel = ({ title, meta, actions, className, children }: Props) => (
  <section className={cn(PANEL, "flex flex-col gap-3", className)}>
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <h2 className="text-base font-semibold">{title}</h2>
        {meta}
      </div>
      {actions}
    </div>
    {children}
  </section>
);
