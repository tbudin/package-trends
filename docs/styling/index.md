# Styling

*package-trends · Using it*

Nothing ships a stylesheet. The chart strokes in `currentColor` and the type is set in `em`, so it inherits rather than imposes.

```tsx
/* the only two colours it would choose for itself */
.pt-change[data-direction="up"]   { color: #15803d; }
.pt-change[data-direction="down"] { color: #b3261e; }
```

The same markup on three surfaces, with nothing changed but the surrounding text
colour. A component that ships its own palette fights every site it lands on.

---
https://tbudin.github.io/package-trends/styling/ · package-trends 0.1.0 · MIT
