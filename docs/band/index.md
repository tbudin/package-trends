# Bands

*package-trends · Charts*

Each bucket's low, mean and high, drawn as a range with the mean marked.

```tsx
<PackageTrend
  package="react"
  chart="band"
  bandSize={7}
/>
```

## Why not candlesticks

A candlestick needs an open and a close — a price at the start of the period and a price at the
end. A day's downloads is one number. Borrowing the shape would mean inventing two of its four
values, so the band shows what the data has: the spread, and the middle.

---
https://tbudin.github.io/package-trends/band/ · package-trends 0.2.1 · MIT
