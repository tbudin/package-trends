# Periods and smoothing

*package-trends · Data*

A named period, or an explicit pair of dates. Long periods bucket into whole weeks or months, measured back from the latest day.

```tsx
import { between } from "package-trends";

<PackageTrend package="react" period="last-month" />
<PackageTrend package="react" period={between("2026-06-01", "2026-08-31")} />
```

## Smoothing never touches the numbers

Daily counts swing threefold across the week, so the drawn line is a 7-day mean by default. Every
figure beside it — total, average, peak, change — comes from the raw series, so a smoothed chart
cannot quietly restate the total. Never sum `trend.values`: it is the drawing, not the
data.

## Questions

**Can I sum trend.values to get the total?**

No. `values` is the smoothed series that gets drawn. Every figure — total, mean, peak, change — comes from the raw points, and `trend.total` is the one to use.

---
https://tbudin.github.io/package-trends/periods/ · package-trends 0.2.0 · MIT
