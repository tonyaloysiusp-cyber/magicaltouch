import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
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
      // Decorative rings + logo reveal for the first-load intro
      // animation (components/home/IntroAnimation.tsx) -- CSS-only,
      // paused automatically by the browser under
      // prefers-reduced-motion as a second line of defense (the
      // component itself already skips rendering the whole overlay in
      // that case).
      keyframes: {
        'intro-orbit': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'intro-orbit-reverse': {
          from: { transform: 'rotate(360deg)' },
          to: { transform: 'rotate(0deg)' },
        },
        'intro-logo-in': {
          '0%': { opacity: '0', transform: 'scale(0.92) translateY(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        'intro-orbit': 'intro-orbit 3s linear infinite',
        'intro-orbit-reverse': 'intro-orbit-reverse 4s linear infinite',
        'intro-logo-in': 'intro-logo-in 0.7s ease-out 0.15s forwards',
      },
    },
  },
  plugins: [],
};
export default config;
