---
"@plainmatter/package-trends": minor
---

Compare several packages at once, from a new `/compare` entry:
`<PackageComparison>` as an overlaid chart or a row each, `compare()` and
`indexSeries()` in the core, and `fetchMany` so a page asks for each distinct
name only once.

`scale="indexed"` restates each series against its own start, which is the
only honest way to put packages of very different sizes on one chart.
