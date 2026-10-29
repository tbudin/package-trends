# analyse()

*package-trends · Data*

The figures you would need to write about a package without looking at the chart.

```tsx
import { analyse, fetchDownloads } from "package-trends";

const a = analyse(await fetchDownloads("react", { period: "last-month" }));

a.direction;    // "rising" | "falling" | "flat"
a.confidence;   // "strong" | "moderate" | "weak", from the r²
a.weekendRatio; // weekday-driven use sits near 0.6
```

The field to build a sentence on is `confidence`. A slope alone will cheerfully
report that react is falling by 390,000 a day; the r² behind it is what says the month was flat and
the slope is noise.

---
https://tbudin.github.io/package-trends/analyse/ · package-trends 0.2.0 · MIT
