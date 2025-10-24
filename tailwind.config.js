/**
 * Tailwind CSS configuration for the SunDevil Pods+ prototype.
 *
 * Tailwind scans the HTML and all files under src/ for utility
 * classes and generates the corresponding CSS. Feel free to
 * extend the theme or add plugins as the prototype matures.
 */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        asuMaroon: '#8C1D40',
        asuGold: '#FFC627',
        asuGray: '#F4F4F4',
      },
      fontFamily: {
        display: ['"Source Sans 3"', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};
