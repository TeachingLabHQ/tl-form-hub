import { useNavigation } from "@remix-run/react";
import { useEffect, useState } from "react";
import { cn } from "~/utils/utils";

// Thin bar across the top of the page while `active`, so waits never feel
// dead. Waits a beat before appearing so instant loads don't flash it.
export const TopProgressBar = ({ active }: { active: boolean }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, [active]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "fixed inset-x-0 top-0 z-[1000] h-1 pointer-events-none transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <div
        className={cn(
          "h-full w-0 rounded-r-full bg-[#0053B3] shadow-[0_0_8px_rgba(0,83,179,0.7)]",
          visible && "animate-nav-progress motion-reduce:animate-none motion-reduce:w-full"
        )}
      />
    </div>
  );
};

// Route transitions (loader data / route modules in flight). In-page loads
// that happen after navigation (client fetches) show it via FormSkeleton.
export const NavigationProgress = () => (
  <TopProgressBar active={useNavigation().state !== "idle"} />
);
