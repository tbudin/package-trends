# Accessibility

*package-trends · Using it*

A sparkline carries nothing a non-sighted reader can use, so every chart gets a sentence instead.

```tsx
<PackageTrend package="react" label="Weekly pulls from npm" />
<PackageTrend package="react" label={(t) => `${t.total.toLocaleString()} downloads`} />
```

- The sentence is the SVG's `<title>`, and `label` replaces it.

- Red and green never carry the meaning alone — the sign is always there, which is what a reader
with a colour deficiency goes by.

- `interactive` makes the chart focusable and arrow-key navigable, and announces the day
under the cursor through a live region.

- A failed fetch renders nothing by default. A download count is never worth breaking a footer
over.

---
https://tbudin.github.io/package-trends/accessibility/ · package-trends 0.1.0 · MIT
