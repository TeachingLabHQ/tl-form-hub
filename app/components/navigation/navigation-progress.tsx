import { useNavigation } from "@remix-run/react";
import { useEffect, useState } from "react";
import { cn } from "~/utils/utils";

// Thin bar across the top of the page while a route transition is pending
// (loader data / route modules in flight), so clicks never feel dead. Waits
// a beat before appearing so instant navigations don't flash it.
export const NavigationProgress = () => {
  const busy = useNavigation().state !== "idle";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!busy) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(timer);
  }, [busy]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "fixed inset-x-0 top-0 z-[1000] h-[3px] pointer-events-none transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <div
        className={cn(
          "h-full w-0 bg-[#0053B3]",
          visible && "animate-nav-progress motion-reduce:animate-none motion-reduce:w-full"
        )}
      />
    </div>
  );
};
