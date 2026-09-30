import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        // Eases toward (never reaching) the end; the bar fades out on arrival
        "nav-progress": {
          from: { width: "0%" },
          to: { width: "90%" },
        },
      },
      animation: {
        "nav-progress": "nav-progress 8s cubic-bezier(0.1, 0.7, 0.2, 1) forwards",
      },
    },
  },
  plugins: [],
} satisfies Config;
