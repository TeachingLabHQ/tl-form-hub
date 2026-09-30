import { useNavigation } from "@remix-run/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "~/utils/utils";

// Count of mounted in-page loaders (e.g. FormSkeleton) holding the bar open.
// Client-side fetches after navigation don't show in useNavigation(), so they
// hold the same bar rather than rendering a second one, which would restart
// from 0 when a route transition hands off to a loading skeleton.
let holds = 0;
const listeners = new Set<() => void>();
const setHolds = (next: number) => {
  holds = next;
  listeners.forEach((l) => l());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useHoldProgressBar = () => {
  useEffect(() => {
    setHolds(holds + 1);
    return () => setHolds(holds - 1);
  }, []);
};

// Thin bar across the top of the page while `active`, so waits never feel
// dead. Waits a beat before appearing so instant loads don't flash it, and
// before hiding so a hand-off (navigation idle one render before a skeleton
// takes hold) doesn't reset the animation.
const TopProgressBar = ({ active }: { active: boolean }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(active), active ? 100 : 50);
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
          "h-full w-0 rounded-r-full bg-[var(--mantine-primary-color-filled)] shadow-[0_0_8px_var(--mantine-primary-color-filled)]",
          visible && "animate-nav-progress motion-reduce:animate-none motion-reduce:w-full"
        )}
      />
    </div>
  );
};

// One bar for the whole app: route transitions (loader data / route modules
// in flight) plus any in-page loaders holding it via useHoldProgressBar().
export const NavigationProgress = () => {
  const navigating = useNavigation().state !== "idle";
  const held = useSyncExternalStore(subscribe, () => holds, () => 0) > 0;
  return <TopProgressBar active={navigating || held} />;
};
