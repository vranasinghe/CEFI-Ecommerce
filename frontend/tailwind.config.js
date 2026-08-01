/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cefi: {
          green: {
            DEFAULT: "#1B4332",
            dark: "#123024",
            light: "#2D6A4F",
            soft: "#E8F0EC"
          },
          gold: {
            DEFAULT: "#C9971C",
            light: "#E0B33A",
            dark: "#9E7512",
            soft: "#FDF8EA"
          },
          cream: {
            DEFAULT: "#FBF9F5",
            dark: "#F4F0E8",
            subtle: "#EFEBE1"
          },
          earth: {
            DEFAULT: "#2D251E",
            muted: "#665B54",
            light: "#8C7E75"
          }
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        cinzel: ['"Cinzel"', 'serif']
      },
      boxShadow: {
        'soft': '0 8px 30px rgba(0, 0, 0, 0.04)',
        'hover': '0 20px 40px rgba(27, 67, 50, 0.08)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
