import { createRoot } from "react-dom/client";
import { PackageTrend, Sparkline } from "../src/react.js";
import type { DownloadRange } from "../src/types.js";

// Fixed data so the harness measures layout, not network timing.
const data: DownloadRange = {
  package: "react",
  start: "2026-09-28",
  end: "2026-10-27",
  points: Array.from({ length: 30 }, (_, i) => {
    const date = new Date(Date.UTC(2026, 8, 28 + i)).toISOString().slice(0, 10);
    const weekend = i % 7 === 5 || i % 7 === 6;
    return { day: date, downloads: Math.round((weekend ? 14_000 : 40_000) * (1 + i * 0.012)) };
  }),
};

function Case({ id, title, note, style, children }: {
  id: string; title: string; note: string;
  style?: React.CSSProperties; children: React.ReactNode;
}) {
  return (
    <section style={{ borderTop: "1px solid #ddd", padding: "14px 0" }}>
      <h2 style={{ font: "500 11px ui-monospace, monospace", letterSpacing: ".08em",
                   textTransform: "uppercase", color: "#555", margin: "0 0 2px" }}>{title}</h2>
      <p style={{ font: "12px system-ui", color: "#666", margin: "0 0 10px" }}>{note}</p>
      <div id={id} style={style}>{children}</div>
    </section>
  );
}

function App() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "32px 16px 80px",
                   font: "15px/1.5 system-ui, sans-serif" }}>
      <h1 style={{ font: "600 18px system-ui", margin: "0 0 20px" }}>package-trends · verification harness</h1>

      <Case id="c-inherit" title="A · inheritance"
            note="Serif, 22px, crimson on the container. Everything inside should follow it."
            style={{ fontFamily: "Georgia, serif", fontSize: 22, color: "crimson" }}>
        <PackageTrend package="react" data={data} variant="text" locale="en-US" />
        <div style={{ height: 8 }} />
        <PackageTrend package="react" data={data} variant="kpi" locale="en-US" />
      </Case>

      <Case id="c-narrow" title="B · narrow container"
            note="A 160px column. The default chart asks for 120px, the KPI for 150."
            style={{ width: 160, outline: "1px dashed #bbb" }}>
        <PackageTrend package="react" data={data} variant="kpi" locale="en-US" />
      </Case>

      <Case id="c-tiny" title="C · very narrow container"
            note="An 80px column. Does anything overflow its box?"
            style={{ width: 80, outline: "1px dashed #bbb" }}>
        <PackageTrend package="react" data={data} variant="sparkline" locale="en-US" />
      </Case>

      <Case id="c-sizes" title="D · explicit sizes"
            note="60×14 inline, then 420×56."
            style={{}}>
        <span>Climbing all month <Sparkline values={[1, 2, 2, 3, 4, 4, 5, 6]} width={60} height={14} /> and still going.</span>
        <div style={{ height: 10 }} />
        <PackageTrend package="react" data={data} width={420} height={56} dot locale="en-US" />
      </Case>

      <Case id="c-a11y" title="E · accessibility"
            note="A labelled chart and a deliberately unlabelled one."
            style={{}}>
        <PackageTrend package="react" data={data} variant="sparkline" locale="en-US" />
        <Sparkline values={[1, 3, 2, 5]} label="Four made-up points" />
        <Sparkline values={[1, 3, 2, 5]} />
      </Case>

      <Case id="c-dark" title="F · on dark"
            note="White text on near-black. The stroke should follow."
            style={{ background: "#15151a", color: "#ececef", padding: 16 }}>
        <PackageTrend package="react" data={data} variant="kpi" locale="en-US" />
      </Case>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
