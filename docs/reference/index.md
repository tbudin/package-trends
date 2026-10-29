# Every option

*package-trends · Reference*

The full surface. 4 entry points, and your bundler drops whatever you do not import.

```tsx
import { … } from "package-trends";          // 8.3 kB gzipped
import { … } from "package-trends/react";    // 6.8 kB
import { … } from "package-trends/compare";  // 6.9 kB
import { … } from "package-trends/heatmap";  // 3.6 kB
```

## Core exports

| Export | What it does |
|---|---|
| `fetchDownloads(name, options)` | One package's range from the npm API. |
| `fetchMany(names, fetchOne)` | Several at once, asking for each distinct name only once. |
| `computeTrend(range, options)` | Totals, peak, trough and change from the raw series, plus the shaped values to draw. |
| `analyse(range, options)` | Growth, fit and r², weekday profile, volatility, spikes, streak. |
| `compare(ranges, options)` | Several ranges on one scale, absolute or indexed. |
| `sparklineSvg(values, options)` | A standalone SVG string, for anywhere outside React. |
| `toWeekly / toMonthly / toBands` | Bucketing. |
| `fillGaps / applyGaps` | The zero repair, on its own. |
| `formatCount / formatChange / formatExact / formatWeekday` | Intl-backed formatting. |
| `describeTrend(trend, locale)` | The sentence a screen reader gets. |
| `between(from, to)` | An explicit date range. |

## Props

| Prop | Type | What it does |
|---|---|---|
| `package` | string | The package name, scoped names included. |
| `data` | DownloadRange | A range already fetched. When set, nothing is requested. |
| `period` | Period | between() | "last-week", "last-month", "last-year", or an explicit pair. |
| `variant` | "sparkline" | "text" | "kpi" | Default sparkline. |
| `chart` | "line" | "column" | "band" | The chart form. |
| `curve` | "linear" | "smooth" | "step" | "step-before" | How the line joins its points. |
| `domain` | [number, number] | "auto" | "zero" | The y-range the values are laid out across. |
| `aggregate` | "week" | "month" | Buckets whole weeks or months back from the latest day. |
| `smooth` | number | Moving-average window for the drawn line. Default 7. |
| `gaps` | "fill" | "zero" | What to do with the days npm has no data for. Default fill. |
| `width / height` | number | string | Pixels, or a CSS length that scales with the text. |
| `fluid` | boolean | Fill the container's width rather than sit at a natural size. |
| `mark / markColor` | MarkKind[] / record | Points to call out: last, peak, trough. |
| `axis / axisColor` | boolean / string | A rule at zero where zero is inside the domain. |
| `fill / fillPattern` | string / FillPattern | Area or bar fill, flat or patterned. |
| `stroke / strokeWidth / strokeDasharray` | string / number / string | The line itself. |
| `colors` | { up, down } | The rise and fall figures. Unset, they inherit. |
| `styles` | record | Inline styles per part: weight, display, spacing. |
| `numberFormat / percentFormat` | Intl.NumberFormatOptions | Merged over the defaults. |
| `locale` | string | Passed to Intl. |
| `label` | string | (trend) => string | The accessible name for the chart. |
| `interactive / onActivePoint` | boolean / fn | Pointer and keyboard inspection. |
| `fallback / renderError` | ReactNode / fn | While loading, and when it fails. |
| `svgProps / pathProps` | record | Anything else the elements should carry. |
| `children` | (state) => ReactNode | Replaces the built-in markup entirely. |

---
https://tbudin.github.io/package-trends/reference/ · package-trends 0.2.1 · MIT
