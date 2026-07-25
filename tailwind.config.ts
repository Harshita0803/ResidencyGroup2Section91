import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#087f70",
          dark: "#075e55",
          pale: "#dff4ec",
        },
        ink: {
          DEFAULT: "#112e2b",
          soft: "#425b57",
        },
        accent: {
          DEFAULT: "#ef8f58",
          pale: "#fff0e6",
        },
        danger: {
          DEFAULT: "#a93c2e",
          pale: "#fff0ec",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
