# Curves

*package-trends · Charts*

How the line joins its points. `smooth` is monotone cubic, not a cardinal spline: between any two points it stays within their values, so it can never draw a count that never happened.

```tsx
<PackageTrend
  package="react"
  curve="linear"
/>
```

## Why not a cardinal spline

A cardinal spline overshoots a local extreme to keep its curvature smooth. On a download count
that means drawing a dip below the real low — and near zero, below zero. A reader cannot tell an
invented value from a real one, so the curve has to be one that cannot invent them.

## Questions

**Why is smoothing monotone cubic rather than a spline?**

A cardinal spline overshoots local extremes, which on a download count draws values that never happened — below the real low, and near zero, below zero. Monotone cubic stays within the two points it joins.

---
https://tbudin.github.io/package-trends/curves/ · package-trends 0.2.1 · MIT
