# Download trends, small enough for a footer

A package's npm downloads as a sparkline, a line of text or a KPI block. No dependencies, no stylesheet, no chart library — `8.3 kB` for the core and `6.8 kB` for the React entry, gzipped as a bundler ships them.

Install

```
npm install package-trends
```

## Three shapes, one component

[**Sparkline** Shape only, for a nav or a table cell.](https://tbudin.github.io/package-trends/sparkline/)
[**Text** One line, inside a sentence.](https://tbudin.github.io/package-trends/text/)
[**KPI** The number leads, the chart confirms.](https://tbudin.github.io/package-trends/kpi/)

## The npm API needs no key

It sends `access-control-allow-origin: *`, so this works straight from a browser
with no proxy of your own. Every chart on this site was fetched by your browser as you loaded
it — change the package in the header and watch them all follow.

## Questions

**Does it need an API key or a proxy?**

No. The npm downloads API is public and sends `access-control-allow-origin: *`, so a browser can call it directly.

**How big is it?**

8.3 kB gzipped for the framework-agnostic core, 6.8 kB for the React entry, 6.9 kB for the comparison chart and 3.6 kB for the heatmap. Each figure is that entry on its own, minified and gzipped, measured on every build. There are no dependencies, and react is a peer you already have.

**Does it work without React?**

Yes. `sparklineSvg` returns an SVG string and the core has no framework in it. This site uses that path and loads no framework at all.

---
https://tbudin.github.io/package-trends/ · package-trends 0.2.0 · MIT
