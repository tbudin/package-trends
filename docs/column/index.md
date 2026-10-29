# Columns

*package-trends · Charts*

Discrete days rather than a continuous line. Columns are anchored at zero, which is the honest baseline for a count.

```tsx
<PackageTrend
  package="react"
  chart="column"
/>
```

Thirty days of a busy package, anchored at zero, draws thirty nearly identical
bars. `aggregate="week"` gives four or five that actually differ — columns want fewer,
fatter bars than a line does.

---
https://tbudin.github.io/package-trends/column/ · package-trends 0.2.1 · MIT
