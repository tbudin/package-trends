---
"package-trends": patch
---

`computeTrend`, `compare` and `analyse` all answered nonsense for a range with
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
