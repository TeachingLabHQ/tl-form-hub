import {
  ActionIcon,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";

// Light/dark switch. Both icons render and CSS picks one, so the server markup
// matches whatever scheme ColorSchemeScript restored before hydration.
export const ColorSchemeToggle = () => {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  return (
    <ActionIcon
      variant="default"
      size="lg"
      aria-label="Toggle dark mode"
      onClick={() =>
        setColorScheme(computedColorScheme === "light" ? "dark" : "light")
      }
    >
      <IconMoon size={18} className="dark:hidden" />
      <IconSun size={18} className="hidden dark:block" />
    </ActionIcon>
  );
};
