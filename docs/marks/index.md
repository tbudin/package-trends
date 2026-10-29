# Marks and axis

*package-trends · Charts*

Points worth calling out, and a rule at zero where zero is inside the range.

```tsx
<PackageTrend
  package="react"
  mark={["last", "peak"]}
/>
```

`axis` only shows for data that crosses zero, which downloads never
do — against `domain="auto"` the rule lands on the bottom edge and is invisible. It is
there for a derived series, such as a day-over-day change, where zero sits in the middle.

---
https://tbudin.github.io/package-trends/marks/ · package-trends 0.1.0 · MIT
