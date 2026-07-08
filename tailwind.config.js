/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgMain: "#030304",
        bgSurface: "rgba(8, 8, 10, 0.85)",
        bgSurface2: "#0F0F12",
        silverAccent: "#F3F4F6",
        silverHover: "#E5E7EB",
        borderAccent: "rgba(255, 255, 255, 0.05)",
        textWhite: "#F3F4F6",
        textMuted: "#9CA3AF",
        forestGreen: "#10B981",
        amberAccent: "#F59E0B",
        indigoGlow: "#6366F1",
        purpleGlow: "#8B5CF6",
      },
      fontFamily: {
        sans: ["Outfit", "sans-serif"],
        body: ["Plus Jakarta Sans", "sans-serif"],
        mono: ["Plus Jakarta Sans", "sans-serif"],
      },
      animation: {
        'pulse-slow': 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 15s linear infinite',
      }
    },
  },
  plugins: [],
}
