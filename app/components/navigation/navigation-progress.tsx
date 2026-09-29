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
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, [busy]);

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
