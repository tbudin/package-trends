# Text

*package-trends · Variants*

One line: the count, the word, the change. It sets no colour of its own unless you ask, so it reads as part of the sentence around it.

```tsx
<PackageTrend
  package="react"
  variant="text"
  colors={{ up: "#15803d", down: "#b3261e" }}
/>
```

Unset, the change inherits the surrounding colour — which is what keeps the
component out of a host's palette. The `data-direction` attribute is on the element
either way, so a stylesheet can colour it instead of a prop.

---
https://tbudin.github.io/package-trends/text/ · package-trends 0.2.0 · MIT
