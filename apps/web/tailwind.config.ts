import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary, #1e3a8a)',
          hover: 'var(--color-primary-hover, #172554)',
        },
        accent: {
          DEFAULT: 'var(--color-accent, #0d9488)',
        },
        crvc: {
          primary: 'var(--color-primary, #1E3A8A)', // Dynamic Deep Blue / Primary
          secondary: 'var(--color-accent, #0D9488)', // Dynamic Teal / Accent
          accent: '#F59E0B', // Amber
          light: '#F8FAFC',
          dark: '#0F172A',
        },
      },
      borderRadius: {
        theme: 'var(--app-radius, 10px)',
      },
      fontFamily: {
        sans: ['var(--font-ui-family)', 'var(--font-prompt)', 'Prompt', 'sans-serif'],
        sarabun: ["'TH SarabunIT๙'", "'TH SarabunIT9'", "'TH Sarabun New'", "'TH SarabunPSK'", "'Sarabun'", 'sans-serif'],
      },
      boxShadow: {
        paper: '0 4px 20px -2px rgba(0, 0, 0, 0.1), 0 2px 6px -1px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
};
export default config;
