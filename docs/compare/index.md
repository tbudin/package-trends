# Comparing packages

*package-trends · Compare*

Several packages on one chart. An absolute scale only reads when the packages are of a like size — and they rarely are.

```tsx
import { PackageComparison } from "package-trends/compare";

<PackageComparison
  packages={["react", "vue", "svelte", "preact"]}
  scale="indexed"
/>
```

On `absolute` react takes the top and the rest collapse onto the floor: the chart
is literally true and tells you nothing. `indexed` restates each series against its own
start, so every line begins at 100 and the chart compares growth instead of size. The
`spread` on the comparison is what tells you which one to use.

---
https://tbudin.github.io/package-trends/compare/ · package-trends 0.2.0 · MIT
