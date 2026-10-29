# Size

*package-trends · Scale*

A number is pixels. A CSS length leaves the `viewBox` alone and renders at that size instead, so a chart set in `em` scales with the text it sits in.

```tsx
<PackageTrend package="react" width="8em" height="1.6em" />
```

A chart never grows past its container either way: one wider than its box
scales down with its aspect ratio kept, so it cannot give the page a horizontal scrollbar.

---
https://tbudin.github.io/package-trends/size/ · package-trends 0.2.0 · MIT
