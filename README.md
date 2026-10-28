# package-trends

npm download trends as a sparkline, a line of text, or a KPI block.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://tbudin.github.io/package-trends/img/variants-dark.png">
  <img alt="The three variants rendered from react's last 30 days: a bare sparkline, the line “954.5M downloads +3.8%”, and a KPI tile pairing the number with a filled chart" src="https://tbudin.github.io/package-trends/img/variants-light.png" width="940">
</picture>

Zero dependencies. Measured as a bundler ships it, gzipped: **9.1 kB** for the
framework-agnostic core, **10.5 kB** with the React components, **12.4 kB** with
comparison as well — the three entries share their modules, so nothing is
counted twice, and your bundler drops whatever you do not import.

The npm downloads API needs no key and sends `access-control-allow-origin: *`,
so this works straight from a browser with no proxy of your own.

```bash
npm install package-trends
```

**[tbudin.github.io/package-trends](https://tbudin.github.io/package-trends/)** —
the site: every option on its own page with a live playground, fetching from npm
as you change it. Put any package name in the header and the whole site follows.

## React

```tsx
import { PackageTrend } from "package-trends/react";

<PackageTrend package="react" />                    // sparkline
<PackageTrend package="react" variant="text" />     // 954.5M downloads +3.8%
<PackageTrend package="react" variant="kpi" />      // the number, the change, the chart
```

Scoped names work as they are: `<PackageTrend package="@tanstack/react-table" />`.

### Render on the server

Fetch once on the server and pass it down, and no visitor costs a request:

```tsx
import { fetchDownloads } from "package-trends";
import { PackageTrend } from "package-trends/react";

export default async function Page() {
  const data = await fetchDownloads("react", { period: "last-month" });
  return <PackageTrend package="react" data={data} variant="kpi" />;
}
```

`data` is plain JSON, so it crosses a server/client boundary unchanged. When it
is set the component never fetches, and it renders fully on the first pass.

### Your own markup

The render prop hands you the trend and nothing else:

```tsx
<PackageTrend package="react" data={data}>
  {({ trend, loading, error }) =>
    trend ? <b>{trend.total.toLocaleString()}</b> : loading ? "…" : null
  }
</PackageTrend>
```

Or take the hook and the bare chart:

```tsx
import { usePackageTrend, Sparkline } from "package-trends/react";

const { trend } = usePackageTrend("react", { period: "last-year", aggregate: "week" });
{trend && <Sparkline values={trend.values} label="react downloads" width={200} dot />}
```

## Without React

The core entry has no framework in it. `sparklineSvg` returns an SVG string for
a template, an email, a static build, or another framework:

```js
import { fetchDownloads, computeTrend, sparklineSvg } from "package-trends";

const range = await fetchDownloads("react");
const trend = computeTrend(range);

element.innerHTML = sparklineSvg(trend.values, { width: 180, dot: true, label: "react downloads" });
```

`sparkline()` gives you the raw path geometry instead, if you want to build the
SVG yourself.

## Smoothing, and why it is on

npm's daily counts swing hard across the week. A weekday can run at three times
its neighbouring Sunday, so a raw daily series draws as a comb rather than a
trend:

| | |
| --- | --- |
| `smooth: 1` | raw daily counts, a comb |
| `smooth: 7` | trailing 7-day mean (**the default**) |
| `aggregate: "week"` | summed into whole weeks, measured back from the latest day |

The leading points with no full window are dropped, so a 30-day series draws 24
points. **Only the drawn line is shaped.** Every figure — `total`, `average`,
`latest`, `peak`, `trough`, `change` — is computed from the raw daily series, so
a smoothed chart never changes the numbers beside it.

## Size

The chart renders at its natural size and **never overflows its container**: a
120px chart inside an 80px column scales down with its aspect ratio kept, rather
than pushing the page sideways. Pass `fluid` to fill the container's width
instead:

```tsx
<PackageTrend package="react" fluid />        // takes the width it is given
<PackageTrend package="react" width={420} height={56} />
```

## Choosing a chart

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://tbudin.github.io/package-trends/img/charts-dark.png">
  <img alt="Five chart types on the same month of data: line, column, band, step and smooth" src="https://tbudin.github.io/package-trends/img/charts-light.png" width="940">
</picture>

Two things are worth knowing before you pick `chart="column"`:

- **Columns want fewer, fatter bars.** Thirty days of a busy package, anchored
  at zero, draws thirty nearly identical bars. `aggregate="week"` gives four or
  five that actually differ.
- **`axis` only shows for data that crosses zero**, which downloads never do —
  the rule lands on the bottom edge and is invisible. It is there for a derived
  series, such as a day-over-day change, where zero sits in the middle.

A note on locales: `en-GB` renders compact millions as a lowercase `m`
(`954.5m`), where `en-US` gives `954.5M`. That is CLDR's own data for British
English, not a bug here. Pass `locale="en-US"` if the capital reads better.

## Gaps in npm's data

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://tbudin.github.io/package-trends/img/gaps-dark.png">
  <img alt="The same month drawn twice. Taking the zeros literally, the line collapses to the floor seven times and reads as a falling month with a mean of 23.8M; with the gaps repaired it is level, mean 31.8M, flat" src="https://tbudin.github.io/package-trends/img/gaps-light.png" width="940">
</picture>

npm's API answers `0` for a day it has no data for, and does not distinguish
that from a day nobody installed the package. For anything with real traffic
those zeros are plainly missing data — a sample of `react` carried **seven of
them in thirty days** — and taken literally they are not a small error:

| | zeros taken literally | gaps repaired |
|---|---|---|
| mean per day | 23,820,776 | **31,817,723** |
| trend | falling | **flat** |
| weekend ÷ weekday | 0.90 | **0.61** |
| quietest day | Tuesday | **Sunday** |

Interior gaps are interpolated from the days either side, which keeps the array
length and the day alignment so weekly buckets and weekday profiles stay
correct. Leading and trailing gaps are dropped. A series that is zero
throughout is left alone — that is a package nobody installs, not a gap.

`gapDays` on the trend and the analysis lists the days that were missing, so you
can say so. Pass `gaps: "zero"` to take the API at its word.

## Reading the data

`analyse(range)` returns the figures you would need to write about a package
without looking at the chart:

```ts
const a = analyse(await fetchDownloads("react", { period: "last-year" }));

a.direction;          // "rising" | "falling" | "flat"
a.confidence;         // "strong" | "moderate" | "weak" — from the r² of a line fit
a.fit.rSquared;       // gate your sentence on this; below ~0.3 it is noise
a.weeklyGrowth;       // compound growth per week, from whole weeks
a.annualisedGrowth;   // that compounded over 52 weeks. An extrapolation, not a forecast
a.weekendRatio;       // weekend mean ÷ weekday mean; low means weekday-driven use
a.busiestWeekday;     // { weekday: 4, mean, share } — formatWeekday(4) is "Thursday"
a.volatility;         // spread around the trend, with the weekly cycle removed
a.spikes;             // days more than 2σ off the fitted line
a.streak;             // { direction: "rising", weeks: 3 }
a.gapDays;            // days npm had no data for
```

The field to build on is `confidence`. A slope on its own will happily tell you
`react` is falling by 390,000 a day; the r² of 0.05 behind it is what says the
month was flat and the slope is noise.

## Typography, display and formatting

There is no `fontWeight` prop, and no `display` prop. One `styles` object
carries all of it, merged over each part's own inline style:

```tsx
<PackageTrend
  package="react"
  variant="kpi"
  styles={{
    root:   { display: "inline-flex" },   // or "inline", "block", anything
    count:  { fontWeight: 400 },          // the headline is 600 by default
    change: { fontWeight: 700 },
    label:  { opacity: 1 },
    chart:  { opacity: 0.45 },
  }}
/>
```

Numbers go through `Intl.NumberFormat`, and you pass its options straight
through rather than learning a second vocabulary:

```tsx
<PackageTrend
  package="react"
  numberFormat={{ notation: "standard" }}          // 954,531,699 not 954.5M
  percentFormat={{ maximumFractionDigits: 2 }}     // +3.81% not +4%
  locale="en-US"
/>
```

## Size

Everything is relative to the surrounding text by default. The text variant
sets no font size at all, the KPI headline is `1.5em` and its label `0.875em`,
so the whole thing grows and shrinks with its container. `styles` overrides any
of it.

The chart can do the same. A number is a width in px; a CSS length leaves the
`viewBox` alone and renders at that size, so the chart tracks the font:

```tsx
<PackageTrend package="react" width="8em" height="1.6em" />   // 104px at 13px text, 176px at 22px
<PackageTrend package="react" width="100%" height={36} />     // fills its box
<PackageTrend package="react" width={170} />                  // fixed px
```

## Properties on the `<svg>`

`svgProps` goes straight onto the element, applied last so it wins:

```tsx
<PackageTrend
  package="react"
  svgProps={{
    id: "pulse",
    "data-pkg": "react",
    onClick: () => open("https://www.npmjs.com/package/react"),
    style: { cursor: "pointer" },
  }}
/>
```

Outside React, `sparklineSvg(values, { attrs: { id: "pulse" } })` does the same
and escapes the values.

## Comparing packages

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://tbudin.github.io/package-trends/img/compare-dark.png">
  <img alt="react, vue, svelte and preact compared. On the absolute scale three of the four lie flat along the bottom; indexed, all four start at 100 and their growth is comparable" src="https://tbudin.github.io/package-trends/img/compare-light.png" width="940">
</picture>

```tsx
import { PackageComparison } from "package-trends/compare";

<PackageComparison packages={["react", "vue", "svelte", "preact"]} />
<PackageComparison packages={[...]} variant="table" />
```

**Read `scale` before you ship one.** Those four packages span 28×, and on one
shared y-range react takes the top of the chart while the other three collapse
into a single band along the floor — true, and useless. `scale="indexed"`
restates each series as a percentage of its own first value, so every line
starts at 100 and the chart compares *growth* instead of size:

```tsx
<PackageComparison packages={[...]} scale="indexed" />
```

The comparison reports `spread` (largest total over smallest) so you can
decide: above about 10, absolute will flatten the smaller packages. Every
figure on each series is computed from its real numbers either way — indexing
only changes what is drawn.

The table variant scales **each row to itself**, because the totals column
already carries the magnitude and a shared scale would leave every row but the
largest a flat line. Pass `sharedDomain` to override. The chart variant always
shares, since overlaying is the point.

Series are told apart by **dash as well as colour** — six hues of near-equal
lightness, each with its own stroke pattern — so they survive print, monochrome
and a reader who cannot rely on hue. Pass `colors`, or `dashes={[]}` for solid
lines.

`fetchMany` asks for each distinct name only once, so a page comparing the same
five packages in three places makes five requests rather than fifteen.

## Curves

`curve` sets how the line joins its points:

| | |
| --- | --- |
| `"linear"` | straight segments (the default) |
| `"smooth"` | monotone cubic |
| `"step"` | holds each value until the next |
| `"step-before"` | steps up first, then across |

`"smooth"` is **monotone cubic, not a cardinal spline**, and the difference is
not cosmetic. A cardinal spline overshoots a local extreme: given a sharp dip,
it draws a curve that passes below the lowest value in the data — a download
count that never happened, and below zero where the low is near it. Monotone
cubic cannot. Between any two points the curve stays within their values, which
is the only kind of smoothing that is safe to apply to counts without
annotation. There is a test that samples the rendered curve and asserts it.

Stepped lines suit weekly or monthly buckets, where the value really did hold
flat for the period rather than sliding between readings.

## Patterns

The line takes a dash, and anything else through `pathProps`:

```tsx
<PackageTrend package="react" strokeDasharray="3 2" />
<PackageTrend package="react" pathProps={{ strokeLinecap: "butt", opacity: 0.4 }} />
```

The area and the bars take a fill pattern — `"hatch"`, `"cross"`, `"dots"` —
which is how you tell two series apart in print, in monochrome, or for a reader
who cannot rely on colour:

```tsx
<PackageTrend package="react" fill="#999" fillPattern="hatch" />
```

Identical patterns share one `<defs>` entry under a stable id derived from the
pattern and the colour, so a page full of charts does not accumulate
definitions and a server render matches the client.

## Bands, and why not candlesticks

`chart="band"` buckets the days and draws each period as a whisker from its low
to its high with a mark at the mean:

```tsx
<PackageTrend package="react" chart="band" bandSize={7} />
```

This is the honest half of a candlestick. Candlesticks need an open and a
close; downloads give one number a day, so two of the four values would have to
be invented. What is real is the spread within the period and where the middle
sat — and on npm data the mark reliably sits high in the whisker, because five
weekdays outweigh two weekend days.

## Hover and keyboard

`interactive` makes the chart follow the pointer and take keyboard focus.
Arrow keys step through the days, Escape clears, and the day under the pointer
is announced in a live region — a chart that only responds to a mouse is no
chart at all for some readers.

```tsx
<PackageTrend package="react" variant="kpi" interactive />
<PackageTrend package="react" interactive onActivePoint={(p) => setDay(p)} />
```

In the KPI variant the headline and the label follow the pointer, so there is
no floating tooltip to position and nothing to clip. `onActivePoint` hands you
the day if you would rather render the readout yourself.

There are no axes, and that is deliberate: a sparkline is defined by their
absence. If you need labelled axes you want a chart library, not this.

## Styling

Nothing ships a stylesheet. The chart strokes in `currentColor`, so it takes the
colour of the text around it. Every part carries a class (`pt-sparkline`,
`pt-text`, `pt-kpi`, `pt-count`, `pt-change`) and the change carries
`data-direction="up" | "down" | "flat"`:

```css
.pt-change[data-direction="up"] { color: green; }
.pt-change[data-direction="down"] { color: crimson; }
```

## Accessibility

A sparkline carries nothing a screen reader can use, so the component puts a
sentence there instead: *"624,912,345 downloads for react between 2026-09-27 and
2026-10-26, up 4% against the half before."* A `Sparkline` with no `label` is
marked `aria-hidden`, on the basis that an unlabelled chart is decoration.

Set `label` to replace that sentence. A function receives the trend, so your own
wording can still carry the numbers:

```tsx
<PackageTrend package="react" label="Weekly pulls from npm" />
<PackageTrend package="react" label={(t) => `${t.total.toLocaleString()} downloads this month`} />
```

## API

| | |
| --- | --- |
| `fetchDownloads(name, options?)` | Reads the daily series. `period`, `signal`, `endpoint`, `fetch`. |
| `computeTrend(range, options?)` | Totals, extremes, the half-over-half change, and the drawable series. |
| `sparkline(values, options?)` | SVG path geometry. |
| `sparklineSvg(values, options?)` | A complete SVG string. |
| `movingAverage` · `toWeekly` · `shapeSeries` | The shaping, on their own. |
| `formatCount` · `formatExact` · `formatChange` · `changeDirection` · `describeTrend` | Presentation helpers. |
| `PackageTrendsError` | Thrown with `package` and, for an HTTP failure, `status`. |

`period` takes npm's own values (`last-day`, `last-week`, `last-month`,
`last-year`) or an explicit range, which `between()` builds and validates:

```ts
import { between } from "package-trends";

<PackageTrend package="react" period={between("2026-06-01", "2026-08-31")} />
```

npm serves at most 18 months of history, the range is inclusive at both ends,
and responses are cached for five minutes.

`aggregate` takes `"day"` (the default, smoothed over 7), `"week"` for 7-day
buckets measured back from the latest day, or `"month"` for calendar months
with the partial ones at either end dropped — a three-day stub beside whole
months reads as a collapse rather than as a short period.

## Running the examples

```bash
npm run dev
```

Builds, then serves `examples/` on <http://localhost:4178> against live npm data.

## Licence

MIT © Plain Matter Pte Ltd. Written by Thomas Budin.
