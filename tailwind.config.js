/** Tema oficial — Veritas Magna Consultoria
 * Fonte normativa: Manual de Identidade Visual v1.0 (2026)
 * Seções: 03 COR (pág. 14-16) · 04 TIPOGRAFIA (pág. 17-19)
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './assets/js/**/*.js'],
  theme: {
    screens: {
      sm: '480px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1440px',
    },
    extend: {
      colors: {
        // Paleta oficial (manual pág. 14)
        navy: '#1E3A42',
        laranja: '#E24125',
        cinza: '#E4E4E4',
        // Escala neutra derivada do navy institucional (manual pág. 15)
        neutra: {
          100: '#1E3A42',
          80: '#4B6168',
          60: '#78898E',
          40: '#A5B0B3',
          20: '#D2D7D9',
          off: '#F7F7F6',
        },
      },
      fontFamily: {
        // Primária · títulos (manual pág. 17)
        heading: ['Montserrat', 'Arial', 'Helvetica', 'sans-serif'],
        // Secundária · texto corrido (manual pág. 17)
        body: ['"Open Sans"', 'Arial', 'Helvetica', 'sans-serif'],
        // Terciária · técnica, opcional (manual pág. 17)
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        label: '0.18em', // caixa alta em rótulos/categorias: 0,16–0,22 em
        title: '-0.015em', // títulos em caixa alta e baixa: -0,01 a -0,02 em
      },
      maxWidth: {
        prose: '75ch', // linha de texto entre 55 e 75 caracteres
      },
      boxShadow: {
        doc: '0 1px 0 0 rgba(30,58,66,0.08)',
      },
      keyframes: {
        'pulse-suave': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(226,65,37,0.35)' },
          '50%': { boxShadow: '0 0 0 10px rgba(226,65,37,0)' },
        },
      },
      animation: {
        'pulse-suave': 'pulse-suave 2.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
