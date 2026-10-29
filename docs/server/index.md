# On the server

*package-trends · Using it*

Fetch once where the page is built and pass it down. No visitor costs a request, and the chart is in the first paint rather than appearing a moment later.

```tsx
import { fetchDownloads } from "package-trends";
import { PackageTrend } from "package-trends/react";

const data = await fetchDownloads("react", { period: "last-month" });

return <PackageTrend package="react" data={data} variant="kpi" />;
```

## Or without React at all

```
import { fetchDownloads, computeTrend, sparklineSvg } from "package-trends";

const trend = computeTrend(await fetchDownloads("react"));
const svg = sparklineSvg(trend.values, { width: 200, height: 40, dot: true });
```

The core is the whole library and the React entry is a wrapper over it. Every chart on
this site is drawn by `sparklineSvg`, which is the same geometry the components use — this
page loads no framework at all.

---
https://tbudin.github.io/package-trends/server/ · package-trends 0.1.0 · MIT
