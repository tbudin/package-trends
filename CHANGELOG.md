# package-trends

## 0.2.0

### Minor Changes

- df8fe6e: A calendar heatmap: one square per day, one column per week, from a new
  `/heatmap` entry. `<PackageHeatmap>` in React, `heatmapSvg()` for a string, and
  `heatmapGeometry()` for the squares as data — all three drawing from one
  computation, so a server render and the client agree square for square.

  It shows the two things a sparkline averages away: where in the year a quiet
  stretch fell, and the weekday rhythm. Across react's last year Wednesday
  averages 20.6M against Saturday's 11.3M.

  The ramp is opacity over `currentColor`, so lightness alone carries the value:
  it inherits the surrounding text colour, inverts on a dark ground with no
  second palette, and survives monochrome. `emptyColor` gives the quietest level
  a colour of its own for GitHub's two-tone look. `scale` defaults to `"linear"`
  spanning zero, because `"quantile"` fills the ramp evenly and so draws a year
  that doubled and a year that never moved identically. Days npm reported nothing
  for are hatched rather than shaded, since a solid square would state a number
  nobody measured.

### Patch Changes

- df8fe6e: `computeTrend`, `compare` and `analyse` all answered nonsense for a range with
  no points. The first two threw a raw `TypeError`, and a throw inside a React
  render takes the whole tree with it — on a server that is the page, not the
  chart. `analyse` was quieter and worse: NaN for `mean` and `median`, and
  `undefined` for `peak` and `trough` behind a type promising a `DownloadPoint`.

  All three now throw `PackageTrendsError` with the package named, and the hooks
  route a failed derivation into the `error` state they already had, so
  `renderError` handles it like any other failure. Renderers are unchanged:
  `sparkline` and `heatmapGeometry` can honestly draw nothing, and
  `<PackageHeatmap>` now shows its fallback rather than a zero-sized `<svg>`.

  `svgProps` is typed to accept the `data-*` attributes its own documentation
  promised; the type had been rejecting them.

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
