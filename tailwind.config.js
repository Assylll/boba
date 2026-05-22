/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        boba: {
          pink: "#EB6A7C",
          "pink-light": "#FFE8EE",
          "pink-dark": "#C8425C",
          mint: "#3BC0A0",
          "mint-light": "#E8FBF5",
          "mint-dark": "#0E8B73",
          cream: "#FFDFAE",
          "cream-dark": "#A76322",
          brown: "#5A3A2A",
          "brown-light": "#FFF4E6",
        },
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'Manrope'", "sans-serif"],
      },
      boxShadow: {
        card: "0 12px 30px rgba(28, 36, 45, 0.08)",
        "card-hover": "0 20px 50px rgba(28, 36, 45, 0.16)",
        glow: "0 10px 28px rgba(235, 106, 124, 0.26)",
      },
      backgroundImage: {
        "aurora-warm":
          "radial-gradient(1200px 420px at 2% -10%, rgba(235,106,124,0.2), transparent 45%), radial-gradient(900px 340px at 98% 6%, rgba(59,192,160,0.18), transparent 42%), radial-gradient(800px 260px at 50% 100%, rgba(255,223,174,0.28), transparent 55%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-7px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-180% 0" },
          "100%": { backgroundPosition: "180% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 420ms ease-out",
        float: "float 5.5s ease-in-out infinite",
        shimmer: "shimmer 2.8s linear infinite",
      },
    },
  },
  plugins: [],
};
