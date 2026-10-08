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
        // ONE site-wide day/night palette (see app/globals.css). Every
        // page uses these, so all pages switch together.
        mt: {
          bg: 'rgb(var(--mt-bg) / <alpha-value>)',
          surface: 'rgb(var(--mt-surface) / <alpha-value>)',
          surface2: 'rgb(var(--mt-surface2) / <alpha-value>)',
          ink: 'rgb(var(--mt-ink) / <alpha-value>)',
          muted: 'rgb(var(--mt-muted) / <alpha-value>)',
          faint: 'rgb(var(--mt-faint) / <alpha-value>)',
          border: 'rgb(var(--mt-border) / <alpha-value>)',
          accent: 'rgb(var(--mt-accent) / <alpha-value>)',
          accentsoft: 'rgb(var(--mt-accent-soft) / <alpha-value>)',
        },
        brand: {
          pink: "#EC1E79",
          purple: "#8B6FC4",
          blue: "#3FA9E8",
          teal: "#4FC8C0",
          green: "#7ED33E",
          yellowgreen: "#C4DA3B",
        },
      },
      borderColor: {
        DEFAULT: 'rgb(var(--mt-border) / <alpha-value>)',
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
        // Continuous ambient background drift
        // (components/home/AnimatedDesignBackground.tsx) -- transform
        // only (translate + scale), never a property that triggers
        // layout, so this is cheap for the compositor to run
        // indefinitely.
        'bg-float-a': {
          '0%, 100%': { transform: 'translate(-4rem, -2.5rem) scale(1)' },
          '50%': { transform: 'translate(-2.5rem, -3.9rem) scale(1.05)' },
        },
        'mt-float': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) rotate(var(--r, 0deg))' },
          '50%': { transform: 'translate3d(0, -14px, 0) rotate(calc(var(--r, 0deg) + 2deg))' },
        },
        'mt-spin-slow': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
        'mt-shine': { '0%': { backgroundPosition: '0% 50%' }, '100%': { backgroundPosition: '200% 50%' } },
        'mt-marquee': { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        'mt-fade-up': { '0%': { opacity: '0', transform: 'translateY(18px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'bg-float-b': {
          '0%, 100%': { transform: 'translate(6rem, 4rem) scale(1)' },
          '50%': { transform: 'translate(7.2rem, 2.8rem) scale(0.96)' },
        },
      },
      animation: {
        'intro-orbit': 'intro-orbit 3s linear infinite',
        'intro-orbit-reverse': 'intro-orbit-reverse 4s linear infinite',
        'intro-logo-in': 'intro-logo-in 0.7s ease-out 0.15s forwards',
        'bg-float-a': 'bg-float-a 10s ease-in-out infinite',
        'bg-float-b': 'bg-float-b 12s ease-in-out infinite',
        'mt-float': 'mt-float 7s ease-in-out infinite',
        'mt-spin-slow': 'mt-spin-slow 40s linear infinite',
        'mt-shine': 'mt-shine 6s linear infinite',
        'mt-marquee': 'mt-marquee 60s linear infinite',
        'mt-fade-up': 'mt-fade-up 0.8s ease-out both',
      },
    },
  },
  plugins: [],
};
export default config;
