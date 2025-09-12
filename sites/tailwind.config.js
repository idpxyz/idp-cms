/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./layouts/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 使用CSS变量
        "brand-primary": "var(--brand-primary)",
        "brand-secondary": "var(--brand-secondary)",
      },
      borderRadius: {
        brand: "var(--brand-radius)",
      },
      boxShadow: {
        brand: "var(--brand-shadow)",
      },
      fontFamily: {
        brand: "var(--brand-font)",
      },
    },
  },
  plugins: [],
};