---
"package-trends": minor
---

Column charts, a fixed `domain` so two charts can be compared, point marks,
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
