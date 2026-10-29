---
"package-trends": minor
---

A calendar heatmap: one square per day, one column per week, from a new
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
