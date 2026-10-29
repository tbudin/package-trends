/* package-trends' own site. Everything that is particular to this package:
   its tokens, its fonts, its credit and where it is published. The chrome,
   the generator and the SEO come from package-site. */

export default {
  tagline: 'download trends small enough for a footer',
  baseUrl: 'https://tbudin.github.io/package-trends/',
  repo: 'https://github.com/tbudin/package-trends',
  editBranch: 'main',
  npm: 'https://www.npmjs.com/package/package-trends',
  author: { name: 'Thomas Budin' },
  owner: 'Plain Matter Pte Ltd',
  programmingLanguage: 'TypeScript',
  runtimePlatform: 'Node.js',
  codeLang: 'tsx',
  findLabel: 'Find a page',
  noMatch: 'Nothing matches. Try “gaps” or “compare”.',
  about: 'A package\'s npm downloads as a sparkline, a line of text or a KPI block. Zero dependencies, a framework-agnostic core and React components. It fetches straight from the npm registry, which needs no key and sends a permissive CORS header, so no proxy is involved.',
  groups: ['Start', 'Variants', 'Charts', 'Scale', 'Data', 'Compare', 'Using it', 'Reference'],

  themeColor: { light: '#ffffff', dark: '#16161a' },
  og: { image: 'og.png', width: 1200, height: 630, alt: 'package-trends: a sparkline, the line 954.5M downloads +3.8%, and a KPI tile, drawn on warm paper' },
  icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%231a1a17'/%3E%3Cpath d='M5 23 L11 19 L15 21 L20 12 L27 8' fill='none' stroke='%23e09b6a' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='27' cy='8' r='2.6' fill='%23e09b6a'/%3E%3C/svg%3E",

  fonts: ['https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,400&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;450;500;600;650&display=swap'],
  preconnect: ['https://api.npmjs.org'],

  theme: {
    tokens: {
      '--bg': '#ffffff', '--fg': '#191917', '--muted': '#64646b', '--line': '#e7e7ea',
      '--line-strong': '#8a8a90',
      '--panel': '#f5f5f6', '--code': '#f7f7f8', '--accent': '#9a4a1e', '--mark': '#f0d9a8',
      '--up': '#15803d', '--down': '#b3261e',
      '--f-ui': '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
      '--f-head': '"Newsreader", Georgia, serif',
      '--f-mono': '"IBM Plex Mono", ui-monospace, SFMono-Regular, monospace',
    },
    dark: {
      '--bg': '#16161a', '--fg': '#eceae4', '--muted': '#9b9b93', '--line': '#2e2e34',
      '--line-strong': '#6e6e78',
      '--panel': '#1d1d22', '--code': '#1c1c21', '--accent': '#e09b6a', '--mark': '#4a3c22',
      '--up': '#4ac98a', '--down': '#e2766c',
    },
    /* The few shapes the previews on this site draw, and nothing else. A
       helper that only one page uses belongs in that page, not here. */
    extra: `
.col-stack { display: flex; flex-direction: column; gap: 16px; align-items: flex-start; width: 100%; }
.cap { font: 500 10.5px/16px var(--f-mono); text-transform: uppercase; letter-spacing: .1em; color: var(--muted); }
.figs { font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; margin: 0; max-width: none; }
.figs b { color: var(--fg); font-weight: 500; }
.kpi-n { font: 650 30px/1 var(--f-ui); letter-spacing: -.025em; font-variant-numeric: tabular-nums; }
.up { color: var(--up); }
.down { color: var(--down); }
.note { color: var(--muted); font-size: 13.5px; }
.err { color: var(--down); font-size: 13px; }
.loading { color: var(--muted); font-size: 13px; }
dl.facts { display: grid; grid-template-columns: auto 1fr; gap: 2px 18px; margin: 0; font-size: 13.5px; }
dl.facts dt { color: var(--muted); font-family: var(--f-mono); font-size: 12px; line-height: 22px; }
dl.facts dd { margin: 0; font-variant-numeric: tabular-nums; }`,
  },

  credit: {
    statement: '{title}, made by {creators}',
    materials: [
      { kind: 'font', name: 'IBM Plex', maker: 'IBM', url: 'https://www.ibm.com/plex/', licence: 'OFL-1.1', use: 'Interface and code' },
      { kind: 'font', name: 'Newsreader', maker: 'Production Type', url: 'https://fonts.google.com/specimen/Newsreader', licence: 'OFL-1.1', use: 'Headings' },
      { kind: 'host', name: 'GitHub Pages', url: 'https://pages.github.com' },
    ],
  },

  assets: { 'package-trends.js': 'site/package-trends.js' },
  static: [['site/static/og.png', 'og.png'], ['site/static/img', 'img']],
};
