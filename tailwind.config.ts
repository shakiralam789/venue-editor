/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        editor: {
          bg: "#0f1115",
          panel: "#171a21",
          panel2: "#1e222b",
          border: "#2a2f3a",
          accent: "#4f8cff",
          accent2: "#3a6fd8",
          muted: "#8b93a7",
          text: "#e6e9ef",
          danger: "#ff5d5d",
          warn: "#ffb454",
          ok: "#46d18a"
        }
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      }
    }
  },
  plugins: []
};
