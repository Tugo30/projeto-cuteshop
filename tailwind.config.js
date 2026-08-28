/** @type {import('tailwindcss').Config} */
export default {
  content : [
    "./resources/**/*.blade.php",
    "./resources/**/*.js",
    "./resources/**/*.jsx"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#dc2626",
        ink: "#16161A",
        accent: "#3D5A6C",
        surface: "#FAFAF8",
        border: "#E4E2DC"
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"]
      },
    },
  },
  plugins: [],
}