/* The pages of package-trends' site.

   Imported twice: by the generator in Node, to write the HTML, and by the
   browser, to redraw a preview when a control moves. So nothing in here may
   reach for a platform's own globals, and every render has to work against
   whatever data it is handed — including the snapshot taken at build time.
*/

import {
  fetchDownloads, fetchMany, computeTrend, analyse, compare,
  sparklineSvg, toBands, formatCount, formatChange, formatExact,
  formatWeekday, describeTrend,
} from './package-trends.js';
import { esc, refTable, installTabs } from './ui.js';
import { logos, PACKAGES } from './logos.js';
import { sizes, dependencies, peerDependencies } from './sizes.js';

const L = 'en-US';
const RIVALS = ['react', 'vue', 'svelte', 'preact'];

/* The site-wide settings. The header shows them, chrome.js keeps them across
   pages, and setGlobals hands them back here. */
/* A select, like every other setting in the header. The list is the packages
   worth demonstrating against; "other" opens a field, because the whole point
   of this library is putting YOUR package's downloads in a footer. */
export const globals = [
  { k: 'pick', label: 'Package', type: 'select', v: 'react', options: PACKAGES.concat([['other', 'other…']]), icons: logos },
  { k: 'pkg', label: 'Name', type: 'text', v: 'react', when: (g) => g.pick === 'other' },
  { k: 'period', label: 'Period', type: 'select', v: 'last-month', options: [['last-week', 'last week'], ['last-month', 'last month'], ['last-year', 'last year']] },
];

const G = { pkg: 'react', period: 'last-month' };
export const setGlobals = (g) => {
  G.period = g.period;
  G.pkg = g.pick === 'other' ? (g.pkg || 'react').trim() : g.pick;
};

/* Taken once when the site is built, so a page that has never been loaded in a
   browser still states real figures — the HTML a crawler is handed is the page,
   not a loading state. The browser refetches on load and the numbers move to
   whatever today's are. */
export const prefetch = async () => ({
  range: await fetchDownloads('react', { period: 'last-month' }),
  rivals: await fetchMany(RIVALS, (n) => fetchDownloads(n, { period: 'last-month' })),
});

/* Every page is its own document now, so moving between them would refetch
   what the last one already had. A day's download count does not change
   within a visit, so it is kept for the session — a failed read of the store
   just means asking npm again. */
const CACHE = 'package-trends:data';
const readCache = () => { try { return JSON.parse(sessionStorage.getItem(CACHE)) || {}; } catch { return {}; } };
const writeCache = (c) => { try { sessionStorage.setItem(CACHE, JSON.stringify(c)); } catch { /* private window */ } };

async function cached(key, fetcher) {
  const c = readCache();
  if (c[key]) return c[key];
  const value = await fetcher();
  c[key] = value;
  writeCache(c);
  return value;
}

/* Only the page that is open, and only what it needs: asking for the four
   rivals on every page is five requests for a page that draws one chart. */
export const load = async (g, page) => ({
  range: await cached(`${G.pkg}|${G.period}`, () => fetchDownloads(G.pkg, { period: G.period })),
  rivals: page?.needs === 'rivals'
    ? await cached(`rivals|${RIVALS.join(',')}`, () => fetchMany(RIVALS, (n) => fetchDownloads(n, { period: 'last-month' })))
    : null,
});

/* A fluid chart keeps the viewBox it is given and stretches to its container,
   so the width here is an aspect ratio against the height. */
const chart = (values, options) => sparklineSvg(values, { width: 760, fluid: true, ...options });

/* A fixed series for the pages that illustrate layout rather than data. */
const SAMPLE = [41, 44, 43, 47, 52, 49, 55, 58, 56, 61, 64, 62, 68, 71, 74];

const figs = (t) => `<p class="figs"><b>${formatCount(t.total, L)}</b> downloads ·
  <span class="${t.changeRatio >= 0 ? 'up' : 'down'}">${formatChange(t.changeRatio, L)}</span> ·
  ${t.start} to ${t.end}${t.gapDays.length ? ` · ${t.gapDays.length} day${t.gapDays.length === 1 ? '' : 's'} repaired` : ''}</p>`;

/* Every render is handed the same shape whether it came from the build or from
   the browser, so none of them has to know which. */
const range = (d) => d?.range;

export const pages = [
  {
    id: 'intro', group: 'Start', title: 'Download trends, small enough for a footer',
    nav: 'Get started',
    keywords: 'install start hello intro npm downloads',
    description: 'Install package-trends and draw a package\'s npm downloads as a sparkline, a line of text or a KPI block — no dependencies, no stylesheet, no chart library.',
    lead: `A package's npm downloads as a sparkline, a line of text or a KPI block. No dependencies, no stylesheet, no chart library — <code>${sizes['.']}</code> for the core and <code>${sizes['./react']}</code> for the React entry, gzipped as a bundler ships them.`,
    render: (s, d) => {
      const t = computeTrend(range(d) ?? SAMPLE);
      return `<div class="col-stack">
        <div style="width:100%">${chart(t.values, { height: 90, dot: true, strokeWidth: 2, fill: 'color-mix(in oklab, currentColor 10%, transparent)', label: describeTrend(t, L) })}</div>
        ${figs(t)}</div>`;
    },
    after: (s, d, { link }) => `<p class="code-label">Install</p>
      ${installTabs('package-trends', { managers: ['npm', 'pnpm', 'yarn', 'bun', 'deno'] })}
      <h2>Three shapes, one component</h2>
      <div class="grid-links">
        <a href="${link('sparkline')}"><b>Sparkline</b><span>Shape only, for a nav or a table cell.</span></a>
        <a href="${link('text')}"><b>Text</b><span>One line, inside a sentence.</span></a>
        <a href="${link('kpi')}"><b>KPI</b><span>The number leads, the chart confirms.</span></a>
      </div>
      <h2>The npm API needs no key</h2>
      <p>It sends <code>access-control-allow-origin: *</code>, so this works straight from a browser
      with no proxy of your own. Every chart on this site was fetched by your browser as you loaded
      it — change the package in the header and watch them all follow.</p>`,
    faq: [
      { q: 'Does it need an API key or a proxy?', a: 'No. The npm downloads API is public and sends <code>access-control-allow-origin: *</code>, so a browser can call it directly.' },
      { q: 'How big is it?', a: `${sizes['.']} gzipped for the framework-agnostic core, ${sizes['./react']} for the React entry, ${sizes['./compare']} for the comparison chart and ${sizes['./heatmap']} for the heatmap. Each figure is that entry on its own, minified and gzipped, measured on every build. ${dependencies.length ? `Dependencies: ${dependencies.join(', ')}.` : 'There are no dependencies'}${peerDependencies.length ? `, and ${peerDependencies.join(' and ')} is a peer you already have.` : '.'}` },
      { q: 'Does it work without React?', a: 'Yes. <code>sparklineSvg</code> returns an SVG string and the core has no framework in it. This site uses that path and loads no framework at all.' },
    ],
  },
  {
    id: 'sparkline', group: 'Variants', title: 'Sparkline', keywords: 'chart line default shape nav table cell',
    description: 'The default variant: shape only, no axes and no labels, sized for a nav, a list row or a table cell.',
    lead: `The default. Shape only — no axes, no labels, nothing but the line — for a nav, a list row or a table cell.`,
    state: { w: 210, h: 44, sw: 1.5, dot: true, fill: false },
    controls: [
      { k: 'w', type: 'range', label: 'Width', min: 60, max: 420, step: 10, unit: 'px' },
      { k: 'h', type: 'range', label: 'Height', min: 14, max: 120, step: 2, unit: 'px' },
      { k: 'sw', type: 'range', label: 'Stroke', min: 0.5, max: 4, step: 0.25 },
      { k: 'dot', type: 'toggle', label: 'Dot on the last point' },
      { k: 'fill', type: 'toggle', label: 'Fill the area' },
    ],
    render: (s, d) => {
      const t = computeTrend(range(d) ?? SAMPLE);
      return sparklineSvg(t.values, {
        width: s.w, height: s.h, dot: s.dot, strokeWidth: s.sw,
        fill: s.fill ? 'color-mix(in oklab, currentColor 12%, transparent)' : undefined,
        label: describeTrend(t, L),
      });
    },
    code: (s) => `<PackageTrend\n  package="${G.pkg}"\n  width={${s.w}} height={${s.h}}${s.sw !== 1.5 ? `\n  strokeWidth={${s.sw}}` : ''}${s.dot ? '\n  dot' : ''}${s.fill ? `\n  fill="color-mix(in oklab, currentColor 12%, transparent)"` : ''}\n/>`,
  },
  {
    id: 'text', group: 'Variants', title: 'Text', keywords: 'inline sentence count change footer',
    description: 'The text variant: the count, the word and the change on one line, inheriting the colour of the sentence it sits in.',
    lead: `One line: the count, the word, the change. It sets no colour of its own unless you ask, so it reads as part of the sentence around it.`,
    state: { colour: true, word: true, weight: '500' },
    controls: [
      { k: 'colour', type: 'toggle', label: 'Colour the change' },
      { k: 'word', type: 'toggle', label: 'Show “downloads”' },
      { k: 'weight', type: 'select', label: 'Change weight', options: [['400', 'regular'], ['500', 'medium'], ['650', 'bold']] },
    ],
    render: (s, d) => {
      const t = computeTrend(range(d) ?? SAMPLE);
      const cls = s.colour ? ` class="${t.changeRatio >= 0 ? 'up' : 'down'}"` : '';
      return `<p style="font-size:18px;margin:0;max-width:none">
        <strong style="font-variant-numeric:tabular-nums">${formatCount(t.total, L)}</strong>${s.word ? ' downloads' : ''}
        <span${cls} style="font-weight:${s.weight};font-variant-numeric:tabular-nums">${formatChange(t.changeRatio, L)}</span></p>`;
    },
    code: (s) => `<PackageTrend\n  package="${G.pkg}"\n  variant="text"${s.colour ? `\n  colors={{ up: "#15803d", down: "#b3261e" }}` : ''}${s.weight !== '500' ? `\n  styles={{ change: { fontWeight: ${s.weight} } }}` : ''}\n/>`,
    after: () => `<p class="note">Unset, the change inherits the surrounding colour — which is what keeps the
      component out of a host's palette. The <code>data-direction</code> attribute is on the element
      either way, so a stylesheet can colour it instead of a prop.</p>`,
  },
  {
    id: 'kpi', group: 'Variants', title: 'KPI', keywords: 'tile dashboard card number block',
    description: 'The KPI variant: a tile where the number leads, the change qualifies it and a small chart shows the number is not a fluke.',
    lead: `A tile. The number leads, the change qualifies it, and the chart is there to show the number is not a fluke.`,
    state: { h: 40, fill: true, name: true },
    controls: [
      { k: 'h', type: 'range', label: 'Chart height', min: 20, max: 96, step: 2, unit: 'px' },
      { k: 'fill', type: 'toggle', label: 'Fill the area' },
      { k: 'name', type: 'toggle', label: 'Show the package name' },
    ],
    render: (s, d) => {
      const t = computeTrend(range(d) ?? SAMPLE);
      return `<div style="width:min(300px,100%)">
        <div style="display:flex;align-items:baseline;gap:9px">
          <span class="kpi-n">${formatCount(t.total, L)}</span>
          <span class="${t.changeRatio >= 0 ? 'up' : 'down'}" style="font-size:13px;font-weight:500;font-variant-numeric:tabular-nums">${formatChange(t.changeRatio, L)}</span>
        </div>
        ${s.name ? `<div class="cap" style="margin:7px 0 11px">${esc(G.pkg)}</div>` : `<div style="height:11px"></div>`}
        ${chart(t.values, { height: s.h, fill: s.fill ? 'color-mix(in oklab, currentColor 10%, transparent)' : undefined, label: describeTrend(t, L) })}
      </div>`;
    },
    code: (s) => `<PackageTrend\n  package="${G.pkg}"\n  variant="kpi"\n  height={${s.h}}${s.fill ? `\n  fill="color-mix(in oklab, currentColor 10%, transparent)"` : ''}\n/>`,
  },
  {
    id: 'curves', group: 'Charts', title: 'Curves', keywords: 'smooth step linear monotone cubic line',
    description: 'How the line joins its points: linear, step, or monotone cubic smoothing that can never draw a count that never happened.',
    lead: `How the line joins its points. <code>smooth</code> is monotone cubic, not a cardinal spline: between any two points it stays within their values, so it can never draw a count that never happened.`,
    state: { curve: 'linear', sw: 1.75, dash: '' },
    controls: [
      { k: 'curve', type: 'select', label: 'Curve', options: ['linear', 'smooth', 'step', 'step-before'] },
      { k: 'sw', type: 'range', label: 'Stroke', min: 0.5, max: 4, step: 0.25 },
      { k: 'dash', type: 'select', label: 'Dash', options: [['', 'solid'], ['5 3', '5 3'], ['2 2', '2 2'], ['7 2 2 2', '7 2 2 2']] },
    ],
    render: (s, d) => chart(computeTrend(range(d) ?? SAMPLE).values, {
      height: 110, curve: s.curve, strokeWidth: s.sw, dot: true,
      strokeDasharray: s.dash || undefined,
      fill: 'color-mix(in oklab, currentColor 8%, transparent)',
    }),
    code: (s) => `<PackageTrend\n  package="${G.pkg}"\n  curve="${s.curve}"${s.dash ? `\n  strokeDasharray="${s.dash}"` : ''}\n/>`,
    after: () => `<h2>Why not a cardinal spline</h2>
      <p>A cardinal spline overshoots a local extreme to keep its curvature smooth. On a download count
      that means drawing a dip below the real low — and near zero, below zero. A reader cannot tell an
      invented value from a real one, so the curve has to be one that cannot invent them.</p>`,
    faq: [{ q: 'Why is smoothing monotone cubic rather than a spline?', a: 'A cardinal spline overshoots local extremes, which on a download count draws values that never happened — below the real low, and near zero, below zero. Monotone cubic stays within the two points it joins.' }],
  },
  {
    id: 'column', group: 'Charts', title: 'Columns', keywords: 'bar chart discrete days aggregate bucket',
    description: 'Discrete days as columns anchored at zero, with weekly or monthly bucketing for packages busy enough that thirty bars look identical.',
    lead: `Discrete days rather than a continuous line. Columns are anchored at zero, which is the honest baseline for a count.`,
    state: { h: 90, aggregate: 'day' },
    controls: [
      { k: 'h', type: 'range', label: 'Height', min: 30, max: 160, step: 5, unit: 'px' },
      { k: 'aggregate', type: 'select', label: 'Bucket', options: [['day', 'day'], ['week', 'week'], ['month', 'month']] },
    ],
    render: (s, d) => {
      const t = computeTrend(range(d) ?? SAMPLE, s.aggregate === 'day' ? {} : { aggregate: s.aggregate });
      return chart(t.values, { chart: 'column', height: s.h, fill: 'currentColor' });
    },
    code: (s) => `<PackageTrend\n  package="${G.pkg}"\n  chart="column"${s.aggregate !== 'day' ? `\n  aggregate="${s.aggregate}"` : ''}\n/>`,
    after: () => `<p class="note">Thirty days of a busy package, anchored at zero, draws thirty nearly identical
      bars. <code>aggregate="week"</code> gives four or five that actually differ — columns want fewer,
      fatter bars than a line does.</p>`,
  },
  {
    id: 'band', group: 'Charts', title: 'Bands', keywords: 'range high low spread candlestick ohlc',
    description: 'Each bucket\'s low, mean and high drawn as a range — the honest alternative to a candlestick, which a daily count cannot fill.',
    lead: `Each bucket's low, mean and high, drawn as a range with the mean marked.`,
    state: { size: 7, h: 110 },
    controls: [
      { k: 'size', type: 'range', label: 'Days per band', min: 2, max: 14, step: 1 },
      { k: 'h', type: 'range', label: 'Height', min: 50, max: 180, step: 5, unit: 'px' },
    ],
    render: (s, d) => {
      const bands = toBands(computeTrend(range(d) ?? SAMPLE).points, s.size);
      return chart(bands.map((b) => b.mean), { chart: 'band', bands, height: s.h });
    },
    code: (s) => `<PackageTrend\n  package="${G.pkg}"\n  chart="band"\n  bandSize={${s.size}}\n/>`,
    after: () => `<h2>Why not candlesticks</h2>
      <p>A candlestick needs an open and a close — a price at the start of the period and a price at the
      end. A day's downloads is one number. Borrowing the shape would mean inventing two of its four
      values, so the band shows what the data has: the spread, and the middle.</p>`,
  },
  {
    id: 'marks', group: 'Charts', title: 'Marks and axis', keywords: 'dot peak trough annotate point zero rule',
    description: 'Calling out the last point, the peak or the trough, and when a rule at zero is worth drawing at all.',
    lead: `Points worth calling out, and a rule at zero where zero is inside the range.`,
    state: { last: true, peak: true, trough: false, axis: false },
    controls: [
      { k: 'last', type: 'toggle', label: 'Last point' },
      { k: 'peak', type: 'toggle', label: 'Peak' },
      { k: 'trough', type: 'toggle', label: 'Trough' },
      { k: 'axis', type: 'toggle', label: 'Zero rule (forces domain)' },
    ],
    render: (s, d) => {
      const mark = [s.last && 'last', s.peak && 'peak', s.trough && 'trough'].filter(Boolean);
      return chart(computeTrend(range(d) ?? SAMPLE).values, {
        height: 110, mark, axis: s.axis, domain: s.axis ? 'zero' : 'auto',
        markColor: { peak: 'var(--up)', trough: 'var(--down)' },
        fill: 'color-mix(in oklab, currentColor 8%, transparent)',
      });
    },
    code: (s) => {
      const mark = [s.last && '"last"', s.peak && '"peak"', s.trough && '"trough"'].filter(Boolean);
      return `<PackageTrend\n  package="${G.pkg}"${mark.length ? `\n  mark={[${mark.join(', ')}]}` : ''}${s.axis ? `\n  axis domain="zero"` : ''}\n/>`;
    },
    after: () => `<p class="note"><code>axis</code> only shows for data that crosses zero, which downloads never
      do — against <code>domain="auto"</code> the rule lands on the bottom edge and is invisible. It is
      there for a derived series, such as a day-over-day change, where zero sits in the middle.</p>`,
  },
  {
    id: 'size', group: 'Scale', title: 'Size', keywords: 'width height em fluid responsive scale inline',
    description: 'Sizing a chart in pixels, in em so it scales with the text it sits in, or fluid so it fills its container.',
    lead: `A number is pixels. A CSS length leaves the <code>viewBox</code> alone and renders at that size instead, so a chart set in <code>em</code> scales with the text it sits in.`,
    state: { mode: 'em', px: 200, em: 8, text: 15 },
    controls: [
      { k: 'mode', type: 'select', label: 'Width given as', options: [['px', 'pixels'], ['em', 'em'], ['pc', '100%']] },
      { k: 'px', type: 'range', label: 'Pixels', min: 60, max: 420, step: 10, unit: 'px', when: (s) => s.mode === 'px' },
      { k: 'em', type: 'range', label: 'Em', min: 3, max: 20, step: 0.5, unit: 'em', when: (s) => s.mode === 'em' },
      { k: 'text', type: 'range', label: 'Surrounding text', min: 11, max: 30, step: 1, unit: 'px' },
    ],
    render: (s) => {
      const width = s.mode === 'px' ? s.px : s.mode === 'em' ? `${s.em}em` : '100%';
      const height = s.mode === 'px' ? 40 : s.mode === 'em' ? '1.6em' : 40;
      return `<div style="font-size:${s.text}px;width:100%;text-align:center;line-height:1.7">
        Downloads have been moving
        ${sparklineSvg(SAMPLE, { width, height, dot: true, attrs: { style: 'display:inline-block;vertical-align:-.2em' } })}
        all month.</div>`;
    },
    code: (s) => s.mode === 'px'
      ? `<PackageTrend package="${G.pkg}" width={${s.px}} height={40} />`
      : s.mode === 'em'
        ? `<PackageTrend package="${G.pkg}" width="${s.em}em" height="1.6em" />`
        : `<PackageTrend package="${G.pkg}" fluid height={40} />`,
    after: () => `<p class="note">A chart never grows past its container either way: one wider than its box
      scales down with its aspect ratio kept, so it cannot give the page a horizontal scrollbar.</p>`,
  },
  {
    id: 'domain', group: 'Scale', title: 'Domain', keywords: 'scale compare y-range zero auto fixed',
    description: 'The y-range values are laid out across, and why two charts side by side are only comparable on a fixed one.',
    lead: `The y-range the values are laid out across. <code>auto</code> runs from the series' own low to its own high — the sparkline convention. A fixed pair is the only way two charts side by side can be compared.`,
    state: { domain: 'auto' },
    controls: [{ k: 'domain', type: 'select', label: 'Domain', options: [['auto', 'auto'], ['zero', 'zero'], ['fixed', 'fixed pair']] }],
    render: (s, d) => {
      const t = computeTrend(range(d) ?? SAMPLE);
      const dom = s.domain === 'fixed' ? [0, Math.max(...t.values) * 1.35] : s.domain;
      return `<div class="col-stack">
        <div style="width:100%">${chart(t.values, { height: 100, domain: dom, dot: true, fill: 'color-mix(in oklab, currentColor 9%, transparent)' })}</div>
        <p class="figs">low <b>${formatCount(t.trough.downloads, L)}</b> · high <b>${formatCount(t.peak.downloads, L)}</b></p></div>`;
    },
    code: (s) => s.domain === 'fixed'
      ? `<PackageTrend package="${G.pkg}" domain={[0, 40_000_000]} />`
      : `<PackageTrend package="${G.pkg}" domain="${s.domain}" />`,
    after: () => `<p class="note">Without a fixed domain a package with a thousand downloads draws exactly the
      same picture as one with a million. That is fine alone and misleading in a row.</p>`,
  },
  {
    id: 'periods', group: 'Data', title: 'Periods and smoothing', keywords: 'week month year range between aggregate smooth',
    description: 'Named periods and explicit date ranges, weekly and monthly bucketing, and why smoothing never touches the figures beside the chart.',
    lead: `A named period, or an explicit pair of dates. Long periods bucket into whole weeks or months, measured back from the latest day.`,
    state: { aggregate: 'day', smooth: 7 },
    controls: [
      { k: 'aggregate', type: 'select', label: 'Bucket', options: [['day', 'day'], ['week', 'week'], ['month', 'month']] },
      { k: 'smooth', type: 'range', label: 'Smoothing window', min: 1, max: 14, step: 1, unit: ' d' },
    ],
    render: (s, d) => {
      const t = computeTrend(range(d) ?? SAMPLE, { ...(s.aggregate === 'day' ? {} : { aggregate: s.aggregate }), smooth: s.smooth });
      return `<div class="col-stack"><div style="width:100%">${chart(t.values, { height: 110, dot: true, fill: 'color-mix(in oklab, currentColor 9%, transparent)' })}</div>${figs(t)}</div>`;
    },
    code: (s) => `import { between } from "package-trends";\n\n<PackageTrend package="${G.pkg}" period="${G.period}"${s.aggregate !== 'day' ? ` aggregate="${s.aggregate}"` : ''}${s.smooth !== 7 ? ` smooth={${s.smooth}}` : ''} />\n<PackageTrend package="${G.pkg}" period={between("2026-06-01", "2026-08-31")} />`,
    after: () => `<h2>Smoothing never touches the numbers</h2>
      <p>Daily counts swing threefold across the week, so the drawn line is a 7-day mean by default. Every
      figure beside it — total, average, peak, change — comes from the raw series, so a smoothed chart
      cannot quietly restate the total. Never sum <code>trend.values</code>: it is the drawing, not the
      data.</p>`,
    faq: [{ q: 'Can I sum trend.values to get the total?', a: 'No. <code>values</code> is the smoothed series that gets drawn. Every figure — total, mean, peak, change — comes from the raw points, and <code>trend.total</code> is the one to use.' }],
  },
  {
    id: 'gaps', group: 'Data', title: 'Gaps in npm\'s data', keywords: 'zero missing repair interpolate npm holes',
    description: 'npm answers 0 for a day it has not aggregated, indistinguishable from a real zero. What that does to the figures, and the repair.',
    lead: `npm answers <code>0</code> for a day it has not aggregated, and gives you no way to tell that from a day nobody installed the package. Taken literally those zeros are not a small error.`,
    state: { gaps: 'fill' },
    controls: [{ k: 'gaps', type: 'select', label: 'Policy', options: [['fill', 'fill — the default'], ['zero', 'zero — take them literally']] }],
    render: (s, d) => {
      const r = range(d) ?? SAMPLE;
      const a = analyse(r, { gaps: s.gaps });
      const t = computeTrend(r, { gaps: s.gaps });
      return `<div class="col-stack">
        <div style="width:100%">${chart(t.values, { height: 110, dot: true, fill: 'color-mix(in oklab, currentColor 9%, transparent)' })}</div>
        <dl class="facts">
          <dt>mean/day</dt><dd>${formatExact(Math.round(a.mean), L)}</dd>
          <dt>direction</dt><dd>${a.direction}</dd>
          <dt>quietest</dt><dd>${formatWeekday(a.quietestWeekday.weekday, L)}</dd>
          <dt>weekend ratio</dt><dd>${a.weekendRatio.toFixed(2)}</dd>
          <dt>days npm missed</dt><dd>${computeTrend(r).gapDays.length} of ${t.points.length}</dd>
        </dl></div>`;
    },
    code: (s) => `<PackageTrend package="${G.pkg}" gaps="${s.gaps}" />\n\n// the days npm had no data for\nconst { gapDays } = computeTrend(await fetchDownloads("${G.pkg}"));`,
    after: () => `<p>Switch the policy above and watch every figure move. On a sample of <code>react</code> seven
      of thirty days came back zero: the mean fell by a quarter, the weekday profile inverted, and a flat
      month read as a falling one. Interior zeros are interpolated from their neighbours and listed in
      <code>gapDays</code>, so you can say so where it matters.</p>`,
    faq: [{ q: 'Why does npm report zero downloads for some days?', a: 'Those are days the registry has not aggregated, not days nobody installed the package — and the API gives you no way to tell the two apart. package-trends interpolates interior zeros from their neighbours and lists them in <code>gapDays</code>.' }],
  },
  {
    id: 'analyse', group: 'Data', title: 'analyse()', keywords: 'statistics growth fit r2 volatility weekday streak',
    description: 'Growth, linear fit and r², weekday profile, weekend ratio, volatility, spikes and streak — the figures behind a sentence about a package.',
    lead: `The figures you would need to write about a package without looking at the chart.`,
    render: (s, d) => {
      const a = analyse(range(d) ?? SAMPLE);
      return `<dl class="facts" style="font-size:14px">
        <dt>direction</dt><dd>${a.direction} <span class="note">(${a.confidence}, r² ${a.fit.rSquared.toFixed(2)})</span></dd>
        <dt>weekly growth</dt><dd>${(a.weeklyGrowth * 100).toFixed(2)}%</dd>
        <dt>annualised</dt><dd>${(a.annualisedGrowth * 100).toFixed(1)}%</dd>
        <dt>mean</dt><dd>${formatExact(Math.round(a.mean), L)}</dd>
        <dt>median</dt><dd>${formatExact(Math.round(a.median), L)}</dd>
        <dt>busiest day</dt><dd>${formatWeekday(a.busiestWeekday.weekday, L)}</dd>
        <dt>quietest day</dt><dd>${formatWeekday(a.quietestWeekday.weekday, L)}</dd>
        <dt>weekend ratio</dt><dd>${a.weekendRatio.toFixed(2)}</dd>
        <dt>volatility</dt><dd>${(a.volatility * 100).toFixed(1)}%</dd>
        <dt>spikes</dt><dd>${a.spikes.length}</dd>
        <dt>streak</dt><dd>${a.streak.weeks} ${a.streak.direction} week${a.streak.weeks === 1 ? '' : 's'}</dd>
      </dl>`;
    },
    code: () => `import { analyse, fetchDownloads } from "package-trends";\n\nconst a = analyse(await fetchDownloads("${G.pkg}", { period: "${G.period}" }));\n\na.direction;    // "rising" | "falling" | "flat"\na.confidence;   // "strong" | "moderate" | "weak", from the r²\na.weekendRatio; // weekday-driven use sits near 0.6`,
    after: () => `<p>The field to build a sentence on is <code>confidence</code>. A slope alone will cheerfully
      report that react is falling by 390,000 a day; the r² behind it is what says the month was flat and
      the slope is noise.</p>`,
  },
  {
    id: 'compare', group: 'Compare', title: 'Comparing packages', keywords: 'versus rivals indexed absolute multi spread',
    description: 'Several packages on one chart, on an absolute scale or indexed against their own start, and the spread figure that tells you which to use.',
    lead: `Several packages on one chart. An absolute scale only reads when the packages are of a like size — and they rarely are.`,
    state: { scale: 'indexed' }, needs: 'rivals',
    controls: [{ k: 'scale', type: 'select', label: 'Scale', options: [['absolute', 'absolute'], ['indexed', 'indexed']] }],
    render: (s, d) => {
      if (!d?.rivals) return `<p class="loading">Fetching ${RIVALS.join(', ')}…</p>`;
      const c = compare(d.rivals, { scale: s.scale });
      const colours = ['#3b82f6', '#f97316', '#14b8a6', '#a855f7'];
      const dashes = ['', '5 3', '2 2', '7 2 2 2'];
      const lines = c.series.map((series, i) => sparklineSvg(series.values, {
        width: 760, height: 150, domain: c.domain, stroke: colours[i],
        strokeDasharray: dashes[i] || undefined, strokeWidth: 1.75,
      }).replace(/^<svg[^>]*>|<\/svg>$/g, '')).join('');
      return `<div style="width:100%">
        <svg viewBox="0 0 760 150" role="img" aria-label="${esc(RIVALS.join(', '))} compared, ${s.scale}" style="display:block;width:100%;height:auto">${lines}</svg>
        <p class="figs" style="margin-top:14px">${c.series.map((series, i) =>
          `<span style="display:inline-flex;align-items:center;gap:.4em;margin-right:1.3em">
            <svg width="20" height="8" aria-hidden="true"><path d="M0 4H20" stroke="${colours[i]}" stroke-width="1.75"${dashes[i] ? ` stroke-dasharray="${dashes[i]}"` : ''} stroke-linecap="round"/></svg>${esc(series.package)}</span>`).join('')}
        <br style="line-height:2.4">spread <b>${c.spread.toFixed(1)}×</b> · largest <b>${esc(c.leader)}</b></p></div>`;
    },
    code: (s) => `import { PackageComparison } from "package-trends/compare";\n\n<PackageComparison\n  packages={["react", "vue", "svelte", "preact"]}\n  scale="${s.scale}"\n/>`,
    after: () => `<p>On <code>absolute</code> react takes the top and the rest collapse onto the floor: the chart
      is literally true and tells you nothing. <code>indexed</code> restates each series against its own
      start, so every line begins at 100 and the chart compares growth instead of size. The
      <code>spread</code> on the comparison is what tells you which one to use.</p>`,
  },
  {
    id: 'server', group: 'Using it', title: 'On the server', keywords: 'ssr next prefetch data prop static core',
    description: 'Fetch once where the page is built and pass the range down, so no visitor costs a request and the chart is in the first paint.',
    lead: `Fetch once where the page is built and pass it down. No visitor costs a request, and the chart is in the first paint rather than appearing a moment later.`,
    render: (s, d) => {
      const t = computeTrend(range(d) ?? SAMPLE);
      return `<div class="col-stack"><div style="width:100%">${chart(t.values, { height: 80, dot: true })}</div>
        <p class="note">This site does both: the chart in the HTML was drawn when the page was built,
        and your browser refetched it on load.</p></div>`;
    },
    code: () => `import { fetchDownloads } from "package-trends";\nimport { PackageTrend } from "package-trends/react";\n\nconst data = await fetchDownloads("${G.pkg}", { period: "${G.period}" });\n\nreturn <PackageTrend package="${G.pkg}" data={data} variant="kpi" />;`,
    after: () => `<h2>Or without React at all</h2>
      <div class="code"><pre>import { fetchDownloads, computeTrend, sparklineSvg } from "package-trends";

const trend = computeTrend(await fetchDownloads("react"));
const svg = sparklineSvg(trend.values, { width: 200, height: 40, dot: true });</pre></div>
      <p class="note">The core is the whole library and the React entry is a wrapper over it. Every chart on
      this site is drawn by <code>sparklineSvg</code>, which is the same geometry the components use — this
      page loads no framework at all.</p>`,
  },
  {
    id: 'styling', group: 'Using it', title: 'Styling', keywords: 'colour font theme css inherit dark currentcolor',
    description: 'No stylesheet ships. The chart strokes in currentColor and sets its type in em, so it inherits a host\'s palette instead of imposing one.',
    lead: `Nothing ships a stylesheet. The chart strokes in <code>currentColor</code> and the type is set in <code>em</code>, so it inherits rather than imposes.`,
    state: { bg: 'paper', size: 15 },
    controls: [
      { k: 'bg', type: 'select', label: 'Surface', options: [['paper', 'the page'], ['dark', 'dark panel'], ['accent', 'accent']] },
      { k: 'size', type: 'range', label: 'Text size', min: 11, max: 28, step: 1, unit: 'px' },
    ],
    render: (s, d) => {
      const t = computeTrend(range(d) ?? SAMPLE);
      const skin = s.bg === 'dark' ? 'background:#15151a;color:#ececef'
        : s.bg === 'accent' ? 'background:var(--accent);color:#fff'
        : 'background:var(--bg);color:var(--fg)';
      return `<div style="${skin};padding:24px 28px;border-radius:10px;font-size:${s.size}px;width:min(420px,100%)">
        <div style="display:flex;align-items:baseline;gap:8px">
          <strong style="font-size:1.7em;font-variant-numeric:tabular-nums">${formatCount(t.total, L)}</strong>
          <span style="opacity:.75;font-variant-numeric:tabular-nums">${formatChange(t.changeRatio, L)}</span>
        </div>
        <div style="margin-top:.7em">${chart(t.values, { height: '2.6em', dot: true })}</div></div>`;
    },
    code: () => `/* the only two colours it would choose for itself */\n.pt-change[data-direction="up"]   { color: #15803d; }\n.pt-change[data-direction="down"] { color: #b3261e; }`,
    after: () => `<p class="note">The same markup on three surfaces, with nothing changed but the surrounding text
      colour. A component that ships its own palette fights every site it lands on.</p>`,
  },
  {
    id: 'accessibility', group: 'Using it', title: 'Accessibility', keywords: 'a11y screen reader label aria keyboard colour',
    description: 'Every chart carries a sentence for a screen reader, the sign always accompanies the colour, and a failed fetch renders nothing rather than breaking a footer.',
    lead: `A sparkline carries nothing a non-sighted reader can use, so every chart gets a sentence instead.`,
    render: (s, d) => {
      const t = computeTrend(range(d) ?? SAMPLE);
      return `<div class="col-stack">
        <div style="width:100%">${chart(t.values, { height: 70, dot: true, label: describeTrend(t, L) })}</div>
        <div><div class="cap">what a screen reader reads</div>
        <p style="margin:7px 0 0">${esc(describeTrend(t, L))}</p></div></div>`;
    },
    code: () => `<PackageTrend package="${G.pkg}" label="Weekly pulls from npm" />\n<PackageTrend package="${G.pkg}" label={(t) => \`\${t.total.toLocaleString()} downloads\`} />`,
    after: () => `<ul>
      <li>The sentence is the SVG's <code>&lt;title&gt;</code>, and <code>label</code> replaces it.</li>
      <li>Red and green never carry the meaning alone — the sign is always there, which is what a reader
      with a colour deficiency goes by.</li>
      <li><code>interactive</code> makes the chart focusable and arrow-key navigable, and announces the day
      under the cursor through a live region.</li>
      <li>A failed fetch renders nothing by default. A download count is never worth breaking a footer
      over.</li></ul>`,
  },
  {
    id: 'reference', group: 'Reference', title: 'Every option', keywords: 'api props reference table exports size',
    description: `The full surface: every prop on the components, every export of the core, and what each of the ${Object.keys(sizes).length} entry points costs.`,
    lead: `The full surface. ${Object.keys(sizes).length} entry points, and your bundler drops whatever you do not import.`,
    hidePlay: true,
    code: () => {
      /* Written out of the measured figures so the comments cannot outlive
         the build that produced them. */
      const rows = [['package-trends', '.'], ['package-trends/react', './react'],
        ['package-trends/compare', './compare'], ['package-trends/heatmap', './heatmap']]
        .filter(([, k]) => sizes[k]);
      const pad = Math.max(...rows.map(([name]) => name.length));
      return rows.map(([name, k], i) =>
        `import { … } from "${name}";${' '.repeat(pad - name.length)}  // ${sizes[k]}${i ? '' : ' gzipped'}`).join('\n');
    },
    codeLabel: 'Entry points',
    ref: [
      ['package', 'string', 'The package name, scoped names included.'],
      ['data', 'DownloadRange', 'A range already fetched. When set, nothing is requested.'],
      ['period', 'Period | between()', '"last-week", "last-month", "last-year", or an explicit pair.'],
      ['variant', '"sparkline" | "text" | "kpi"', 'Default sparkline.'],
      ['chart', '"line" | "column" | "band"', 'The chart form.'],
      ['curve', '"linear" | "smooth" | "step" | "step-before"', 'How the line joins its points.'],
      ['domain', '[number, number] | "auto" | "zero"', 'The y-range the values are laid out across.'],
      ['aggregate', '"week" | "month"', 'Buckets whole weeks or months back from the latest day.'],
      ['smooth', 'number', 'Moving-average window for the drawn line. Default 7.'],
      ['gaps', '"fill" | "zero"', 'What to do with the days npm has no data for. Default fill.'],
      ['width / height', 'number | string', 'Pixels, or a CSS length that scales with the text.'],
      ['fluid', 'boolean', "Fill the container's width rather than sit at a natural size."],
      ['mark / markColor', 'MarkKind[] / record', 'Points to call out: last, peak, trough.'],
      ['axis / axisColor', 'boolean / string', 'A rule at zero where zero is inside the domain.'],
      ['fill / fillPattern', 'string / FillPattern', 'Area or bar fill, flat or patterned.'],
      ['stroke / strokeWidth / strokeDasharray', 'string / number / string', 'The line itself.'],
      ['colors', '{ up, down }', 'The rise and fall figures. Unset, they inherit.'],
      ['styles', 'record', 'Inline styles per part: weight, display, spacing.'],
      ['numberFormat / percentFormat', 'Intl.NumberFormatOptions', 'Merged over the defaults.'],
      ['locale', 'string', 'Passed to Intl.'],
      ['label', 'string | (trend) => string', 'The accessible name for the chart.'],
      ['interactive / onActivePoint', 'boolean / fn', 'Pointer and keyboard inspection.'],
      ['fallback / renderError', 'ReactNode / fn', 'While loading, and when it fails.'],
      ['svgProps / pathProps', 'record', 'Anything else the elements should carry.'],
      ['children', '(state) => ReactNode', 'Replaces the built-in markup entirely.'],
    ],
    refHeaders: ['Prop', 'Type', 'What it does'],
    refTitle: 'Props',
    after: () => refTable([
      ['fetchDownloads(name, options)', "One package's range from the npm API."],
      ['fetchMany(names, fetchOne)', 'Several at once, asking for each distinct name only once.'],
      ['computeTrend(range, options)', 'Totals, peak, trough and change from the raw series, plus the shaped values to draw.'],
      ['analyse(range, options)', 'Growth, fit and r², weekday profile, volatility, spikes, streak.'],
      ['compare(ranges, options)', 'Several ranges on one scale, absolute or indexed.'],
      ['sparklineSvg(values, options)', 'A standalone SVG string, for anywhere outside React.'],
      ['toWeekly / toMonthly / toBands', 'Bucketing.'],
      ['fillGaps / applyGaps', 'The zero repair, on its own.'],
      ['formatCount / formatChange / formatExact / formatWeekday', 'Intl-backed formatting.'],
      ['describeTrend(trend, locale)', 'The sentence a screen reader gets.'],
      ['between(from, to)', 'An explicit date range.'],
    ], ['Export', 'What it does'], 'Core exports'),
  },
];
