import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  // Follow Mantine's color scheme (set on <html>) so `dark:` matches the toggle
  darkMode: ["selector", '[data-mantine-color-scheme="dark"]'],
  theme: {
    extend: {
      keyframes: {
        // Eases toward (never reaching) the end; the bar fades out on arrival
        "nav-progress": {
          from: { width: "0%" },
          to: { width: "90%" },
        },
        // Conditional form sections ease in instead of popping into place
        "fade-in": {
          from: { opacity: "0", transform: "translateY(-4px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        "nav-progress": "nav-progress 8s cubic-bezier(0.1, 0.7, 0.2, 1) forwards",
        "fade-in": "fade-in 200ms ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
