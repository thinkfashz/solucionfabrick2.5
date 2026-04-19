/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/tienda/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        yellow: {
          electric: '#FACC15',
          glow: '#FDE047',
          deep: '#CA8A04',
        },
      },
      fontFamily: {
        playfair:   ['Playfair Display', 'serif'],
        inter:      ['Inter', 'sans-serif'],
        cormorant:  ['Cormorant Garamond', 'serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '3rem',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      boxShadow: {
        'yellow-sm': '0 0 15px rgba(250,204,21,0.25)',
        'yellow-md': '0 0 30px rgba(250,204,21,0.35)',
        'yellow-lg': '0 0 60px rgba(250,204,21,0.4)',
        'yellow-xl': '0 0 100px rgba(250,204,21,0.45)',
      },
      animation: {
        'spin-slow': 'spin 20s linear infinite',
      },
    },
  },
  plugins: [],
};
