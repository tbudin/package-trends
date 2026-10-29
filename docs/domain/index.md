# Domain

*package-trends · Scale*

The y-range the values are laid out across. `auto` runs from the series' own low to its own high — the sparkline convention. A fixed pair is the only way two charts side by side can be compared.

```tsx
<PackageTrend package="react" domain="auto" />
```

Without a fixed domain a package with a thousand downloads draws exactly the
same picture as one with a million. That is fine alone and misleading in a row.

---
https://tbudin.github.io/package-trends/domain/ · package-trends 0.1.0 · MIT
