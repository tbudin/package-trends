# @plainmatter/package-trends

npm download trends as a sparkline, a line of text, or a KPI block.

Zero dependencies. The core is framework-agnostic and 3.1 kB gzipped; the React
entry adds 4.1 kB. The npm downloads API needs no key and sends
`access-control-allow-origin: *`, so this works straight from a browser with no
proxy of your own.

```bash
npm install @plainmatter/package-trends
```

## React

```tsx
import { PackageTrend } from "@plainmatter/package-trends/react";

<PackageTrend package="react" />                    // sparkline
<PackageTrend package="react" variant="text" />     // 624.9M downloads +4.2%
<PackageTrend package="react" variant="kpi" />      // the number, the change, the chart
```

Scoped names work as they are: `<PackageTrend package="@tanstack/react-table" />`.

### Render on the server

Fetch once on the server and pass it down, and no visitor costs a request:

```tsx
import { fetchDownloads } from "@plainmatter/package-trends";
import { PackageTrend } from "@plainmatter/package-trends/react";

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
import { usePackageTrend, Sparkline } from "@plainmatter/package-trends/react";

const { trend } = usePackageTrend("react", { period: "last-year", aggregate: "week" });
{trend && <Sparkline values={trend.values} label="react downloads" width={200} dot />}
```

## Without React

The core entry has no framework in it. `sparklineSvg` returns an SVG string for
a template, an email, a static build, or another framework:

```js
import { fetchDownloads, computeTrend, sparklineSvg } from "@plainmatter/package-trends";

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
`last-year`) or an explicit `YYYY-MM-DD:YYYY-MM-DD` range. npm serves at most 18
months of history and caches responses for five minutes.

## Running the examples

```bash
npm run dev
```

Builds, then serves `examples/` on <http://localhost:4178> against live npm data.

## Licence

MIT © Plain Matter Pte Ltd. Written by Thomas Budin.
