# package-trends

## 0.1.0

### Minor Changes

- b89c465: Column charts, a fixed `domain` so two charts can be compared, point marks,
  settable up/down colours, and `analyse()` for writing about a series
  programmatically.

  Adds a `styles` object for weight, display and spacing; `numberFormat` and
  `percentFormat` taking `Intl.NumberFormat` options; `interactive` for pointer
  and keyboard inspection; `aggregate: "month"`; `between()` for an explicit date
  range; a `band` chart of each period's low, mean and high; CSS lengths for
  `width` and `height` so a chart can scale with its text; `curve` for smooth,
  stepped or straight lines; `strokeDasharray`, `pathProps` and `fillPattern`
  for patterned charts; and `svgProps` for anything else the `<svg>` should
  carry.

  Also repairs the zeros npm reports for days it has no data for. Taken
  literally they understate the mean by a quarter and invert the weekday
  profile; they are now interpolated, and listed in `gapDays`.

- b89c465: Compare several packages at once, from a new `/compare` entry:
  `<PackageComparison>` as an overlaid chart or a row each, `compare()` and
  `indexSeries()` in the core, and `fetchMany` so a page asks for each distinct
  name only once.

  `scale="indexed"` restates each series against its own start, which is the
  only honest way to put packages of very different sizes on one chart.

- b89c465: First release. npm download trends as a sparkline, a line of text or a KPI
  block, with a framework-agnostic core and a React entry. Pass `data` from a
  server-side `fetchDownloads` to render without a request per visitor.
