import { createTheme, type MantineColorsTuple } from "@mantine/core";

// Teaching Lab blue (#0053B3) at index 6, the shade Mantine uses for filled
// components in light mode
const brand: MantineColorsTuple = [
  "#e7f1fc",
  "#cfe1f7",
  "#a0c2ee",
  "#6ea1e5",
  "#4485dd",
  "#1f6cd2",
  "#0053b3",
  "#004a9f",
  "#003f89",
  "#003370",
];

export const theme = createTheme({
  primaryColor: "brand",
  // A lighter blue in dark mode keeps filled buttons readable on dark surfaces
  primaryShade: { light: 6, dark: 5 },
  colors: { brand },
  defaultRadius: "md",
  cursorType: "pointer",
  headings: {
    fontWeight: "700",
  },
  components: {
    Paper: {
      defaultProps: { radius: "lg" },
    },
    Card: {
      defaultProps: { radius: "lg" },
    },
    Notification: {
      defaultProps: { radius: "md" },
    },
  },
});
