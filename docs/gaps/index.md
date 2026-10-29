# Gaps in npm's data

*package-trends · Data*

npm answers `0` for a day it has not aggregated, and gives you no way to tell that from a day nobody installed the package. Taken literally those zeros are not a small error.

```tsx
<PackageTrend package="react" gaps="fill" />

// the days npm had no data for
const { gapDays } = computeTrend(await fetchDownloads("react"));
```

Switch the policy above and watch every figure move. On a sample of `react` seven
of thirty days came back zero: the mean fell by a quarter, the weekday profile inverted, and a flat
month read as a falling one. Interior zeros are interpolated from their neighbours and listed in
`gapDays`, so you can say so where it matters.

## Questions

**Why does npm report zero downloads for some days?**

Those are days the registry has not aggregated, not days nobody installed the package — and the API gives you no way to tell the two apart. package-trends interpolates interior zeros from their neighbours and lists them in `gapDays`.

---
https://tbudin.github.io/package-trends/gaps/ · package-trends 0.2.0 · MIT
