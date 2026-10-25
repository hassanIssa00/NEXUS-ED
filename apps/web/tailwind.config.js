import { fontFamily } from 'tailwindcss/defaultTheme';
import tailwindcssAnimate from 'tailwindcss-animate';

const institutionalNavy = {
    50: '#F4F6F7',
    100: '#E8EDF0',
    200: '#D3DDE3',
    300: '#B8C7D0',
    400: '#91A5B2',
    500: '#6A8494',
    600: '#4A687C',
    700: '#35556B',
    800: '#2A485E',
    900: '#203D52',
    950: '#132A3A',
};

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class'],
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            fontFamily: {
                sans: ['Cairo', ...fontFamily.sans],
                arabic: ['Cairo', ...fontFamily.sans],
                display: ['Cairo', ...fontFamily.sans],
            },
            colors: {
                // Semantic Shadcn Colors
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                    // Maintain backward compatibility with some legacy colors if needed
                    50: institutionalNavy[50],
                    100: institutionalNavy[100],
                    500: institutionalNavy[600],
                    600: institutionalNavy[800],
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                    500: '#98793E',
                },
                // Retire the saturated blue / cyan / purple UI palette in favor
                // of one institutional navy scale. Status colors stay semantic.
                blue: institutionalNavy,
                sky: institutionalNavy,
                cyan: institutionalNavy,
                teal: institutionalNavy,
                indigo: institutionalNavy,
                violet: institutionalNavy,
                purple: institutionalNavy,
                fuchsia: institutionalNavy,
                pink: institutionalNavy,
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
                // Legacy Nexus Colors (For smooth migration of existing components)
                nexus: {
                    bg: 'hsl(var(--background))',
                    card: 'hsl(var(--card))',
                    border: 'hsl(var(--border))',
                },
                // Semantic colors (Tailwind defaults adapted for semantic use)
                success: { DEFAULT: '#10B981', foreground: '#ffffff' },
                warning: { DEFAULT: '#F59E0B', foreground: '#ffffff' },
                error: { DEFAULT: '#EF4444', foreground: '#ffffff' },
                info: { DEFAULT: '#35556B', foreground: '#ffffff' },
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
                'nexus': '16px',
                'nexus-sm': '12px',
                'nexus-xs': '8px',
            },
            backdropBlur: {
                glass: '16px',
            },
            boxShadow: {
                'nexus': '0 4px 24px rgba(0, 0, 0, 0.05)',
                'nexus-dark': '0 4px 24px rgba(0, 0, 0, 0.25)',
                'glow-primary': '0 0 20px rgba(152, 121, 62, 0.2)',
                'glow-secondary': '0 0 20px rgba(35, 74, 101, 0.2)',
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' },
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' },
                },
                'fade-in': {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'slide-up': {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'fade-in': 'fade-in 0.5s ease-out',
                'slide-up': 'slide-up 0.5s ease-out',
            },
        },
    },
    plugins: [tailwindcssAnimate],
};
