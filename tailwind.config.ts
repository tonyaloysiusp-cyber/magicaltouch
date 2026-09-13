import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: "#EC1E79",
          purple: "#8B6FC4",
          blue: "#3FA9E8",
          teal: "#4FC8C0",
          green: "#7ED33E",
          yellowgreen: "#C4DA3B",
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(90deg, #EC1E79, #8B6FC4, #3FA9E8, #4FC8C0, #7ED33E, #C4DA3B)',
      },
    },
  },
  plugins: [],
};
export default config;
