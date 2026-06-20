/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      // 色はテーマごとに CSS 変数で注入するため、ここでは変数参照のみ用意
      colors: {
        bg: 'var(--c-bg)',
        surface: 'var(--c-surface)',
        surfaceAlt: 'var(--c-surface-alt)',
        ink: 'var(--c-text)',
        muted: 'var(--c-muted)',
        accent: 'var(--c-accent)',
        accentInk: 'var(--c-accent-ink)',
        line: 'var(--c-border)'
      },
      fontFamily: {
        heading: 'var(--font-heading)',
        body: 'var(--font-body)'
      },
      maxWidth: {
        content: '1080px'
      }
    }
  },
  plugins: []
};
