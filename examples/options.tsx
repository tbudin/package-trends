import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { PackageTrend, Sparkline } from "../src/react.js";
import { analyse, between, computeTrend, fetchDownloads, formatWeekday } from "../src/index.js";
import type { DownloadRange } from "../src/types.js";

const PKG = "react";

function Row({ code, children }: { code: string; children: React.ReactNode }) {
  return (
    <div className="row">
      <div className="demo">{children}</div>
      <code>{code}</code>
    </div>
  );
}

function Group({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {note ? <p className="note">{note}</p> : null}
      {children}
    </section>
  );
}

function Gallery({ data }: { data: DownloadRange }) {
  const trend = computeTrend(data);
  const weekly = computeTrend(data, { aggregate: "week" });
  const a = analyse(data);

  return (
    <main>
      <header>
        <h1>package-trends · every option</h1>
        <p className="note">
          Live <code>{data.package}</code>, {data.start} to {data.end}. One fetch, shared by everything below.
        </p>
      </header>

      <Group title="variant" note="What the component renders.">
        <Row code='<PackageTrend package="react" />'>
          <PackageTrend package={PKG} data={data} locale="en-GB" />
        </Row>
        <Row code='variant="text"'>
          <PackageTrend package={PKG} data={data} variant="text" locale="en-GB" />
        </Row>
        <Row code='variant="kpi"'>
          <PackageTrend package={PKG} data={data} variant="kpi" locale="en-GB" />
        </Row>
      </Group>

      <Group title="chart" note="Line reads shape; columns read magnitude, so they start at zero.">
        <Row code='chart="line"'>
          <PackageTrend package={PKG} data={data} width={170} />
        </Row>
        <Row code='chart="column"'>
          <PackageTrend package={PKG} data={data} chart="column" width={170} />
        </Row>
        <Row code='chart="column" aggregate="week"'>
          <PackageTrend package={PKG} data={data} chart="column" aggregate="week" width={170} />
        </Row>
      </Group>

      <Group title="mark · markColor" note="Points called out. last wins over high on a shared point.">
        <Row code='mark={["last"]}  (or dot)'>
          <PackageTrend package={PKG} data={data} mark={["last"]} width={170} />
        </Row>
        <Row code='mark={["high","low"]}'>
          <PackageTrend package={PKG} data={data} mark={["high", "low"]} width={170} />
        </Row>
        <Row code='mark={["high","low","first","last"]} markColor={{high:"#c2410c",low:"#1d4ed8"}}'>
          <PackageTrend
            package={PKG} data={data} width={170}
            mark={["high", "low", "first", "last"]}
            markColor={{ high: "#c2410c", low: "#1d4ed8" }}
          />
        </Row>
        <Row code='chart="column" mark={["high"]} markColor={{high:"#c2410c"}}'>
          <PackageTrend
            package={PKG} data={data} chart="column" width={170}
            aggregate="week" mark={["high"]} markColor={{ high: "#c2410c" }}
          />
        </Row>
      </Group>

      <Group title="domain" note="The only way two charts side by side can be compared.">
        <Row code='domain="auto"  — each scales to itself'>
          <span className="pair">
            <Sparkline values={trend.values} width={150} />
            <Sparkline values={trend.values.map((v) => v / 40)} width={150} />
          </span>
        </Row>
        <Row code='domain={[0, 40_000_000]}  — same scale, 40× apart'>
          <span className="pair">
            <Sparkline values={trend.values} width={150} domain={[0, 40_000_000]} />
            <Sparkline values={trend.values.map((v) => v / 40)} width={150} domain={[0, 40_000_000]} />
          </span>
        </Row>
        <Row code='domain="zero"'>
          <Sparkline values={trend.values} width={150} domain="zero" />
        </Row>
      </Group>

      <Group title="axis" note="A rule at zero, drawn only when zero is inside the domain.">
        <Row code='chart="column" axis'>
          <PackageTrend package={PKG} data={data} chart="column" axis width={170} aggregate="week" />
        </Row>
        <Row code='axis axisColor="#c2410c"'>
          <PackageTrend package={PKG} data={data} chart="column" axis axisColor="#c2410c" width={170} aggregate="week" />
        </Row>
      </Group>

      <Group title="fill · stroke · strokeWidth">
        <Row code='(nothing — inherits the text colour)'>
          <PackageTrend package={PKG} data={data} width={170} />
        </Row>
        <Row code='fill="rgba(0,0,0,.08)"'>
          <PackageTrend package={PKG} data={data} fill="rgba(0,0,0,.08)" width={170} />
        </Row>
        <Row code='stroke="#c2410c" strokeWidth={2.5}'>
          <PackageTrend package={PKG} data={data} stroke="#c2410c" strokeWidth={2.5} width={170} />
        </Row>
      </Group>

      <Group title="aggregate · smooth" note="Only the drawn line is shaped; the figures stay raw.">
        <Row code='smooth={1}  — raw daily'>
          <PackageTrend package={PKG} data={data} smooth={1} width={300} />
        </Row>
        <Row code='(default)  — 7-day mean'>
          <PackageTrend package={PKG} data={data} width={300} />
        </Row>
        <Row code='aggregate="week"'>
          <PackageTrend package={PKG} data={data} aggregate="week" width={300} />
        </Row>
      </Group>

      <Group title="colors" note="Unset, the change inherits the surrounding text. data-direction is always there.">
        <Row code='(nothing)'>
          <PackageTrend package={PKG} data={data} variant="text" locale="en-GB" />
        </Row>
        <Row code='colors={{up:"#15803d", down:"#b91c1c"}}'>
          <PackageTrend package={PKG} data={data} variant="text" colors={{ up: "#15803d", down: "#b91c1c" }} locale="en-GB" />
        </Row>
        <Row code='colors={{up:"#1d4ed8"}}'>
          <PackageTrend package={PKG} data={data} variant="text" colors={{ up: "#1d4ed8" }} locale="en-GB" />
        </Row>
      </Group>

      <Group title="size · fluid" note="Never overflows: a chart wider than its box scales down.">
        <Row code='width={60} height={14}'>
          <span>in a sentence <Sparkline values={trend.values} width={60} height={14} /> and on</span>
        </Row>
        <Row code='(default 120×32)'>
          <PackageTrend package={PKG} data={data} />
        </Row>
        <Row code='width={420} height={56} dot'>
          <PackageTrend package={PKG} data={data} width={420} height={56} dot />
        </Row>
        <Row code='fluid  — inside a 220px box'>
          <span className="box">
            <PackageTrend package={PKG} data={data} fluid />
          </span>
        </Row>
        <Row code='(default) inside an 80px box — scales down, no overflow'>
          <span className="box small">
            <PackageTrend package={PKG} data={data} />
          </span>
        </Row>
      </Group>

      <Group title="period" note="Each of these is its own fetch in real use.">
        <Row code='period="last-week"'>
          <PackageTrend package={PKG} period="last-week" width={170} />
        </Row>
        <Row code='period="last-month"  (default)'>
          <PackageTrend package={PKG} period="last-month" width={170} />
        </Row>
        <Row code='period="last-year" aggregate="week"'>
          <PackageTrend package={PKG} period="last-year" aggregate="week" width={170} />
        </Row>
      </Group>

      <Group title="gaps" note="npm answers 0 for days it has no data for. Seven of these thirty.">
        <Row code='(default) gaps="fill"  — no dives to the floor'>
          <PackageTrend package={PKG} data={data} smooth={1} width={320} height={60} domain="zero" />
        </Row>
        <Row code='gaps="zero"  — the API taken literally'>
          <PackageTrend package={PKG} data={data} smooth={1} gaps="zero" width={320} height={60} domain="zero" />
        </Row>
        <Row code='same two, 7-day mean'>
          <span className="pair">
            <PackageTrend package={PKG} data={data} width={150} height={40} domain="zero" />
            <PackageTrend package={PKG} data={data} gaps="zero" width={150} height={40} domain="zero" />
          </span>
        </Row>
      </Group>

      <Group title="label · fallback · renderError · children">
        <Row code='label="Weekly pulls"  (read by a screen reader)'>
          <PackageTrend package={PKG} data={data} label="Weekly pulls" width={170} />
        </Row>
        <Row code='(loading — a block at the chart size)'>
          <PackageTrend package={PKG} width={170} fetch={(() => new Promise<Response>(() => {})) as typeof fetch} />
        </Row>
        <Row code='fallback={<em>fetching…</em>}'>
          <PackageTrend
            package={PKG} width={170} fallback={<em>fetching…</em>}
            fetch={(() => new Promise<Response>(() => {})) as typeof fetch}
          />
        </Row>
        <Row code='renderError={(e) => <em>{e.message}</em>}'>
          <PackageTrend
            package="this-package-does-not-exist-xyz-2" width={170}
            renderError={(e) => <em className="err">{e.message}</em>}
          />
        </Row>
        <Row code='{({trend}) => ...}  — your own markup'>
          <PackageTrend package={PKG} data={data}>
            {({ trend: t }) => <b>{t ? `${t.points.length} days, peak ${t.peak.day}` : "…"}</b>}
          </PackageTrend>
        </Row>
      </Group>

      <Group title="styles" note="Weight, display, spacing — one object, merged over each part.">
        <Row code='(default) count is 600'>
          <PackageTrend package={PKG} data={data} variant="kpi" locale="en-GB" />
        </Row>
        <Row code='styles={{count:{fontWeight:400}, change:{fontWeight:700}}}'>
          <PackageTrend package={PKG} data={data} variant="kpi" locale="en-GB"
            styles={{ count: { fontWeight: 400 }, change: { fontWeight: 700 } }} />
        </Row>
        <Row code='styles={{root:{display:"inline"}}}  — flows in a sentence'>
          <span>downloads <PackageTrend package={PKG} data={data} width={70} height={16}
            styles={{ root: { display: "inline" } }} /> this month</span>
        </Row>
        <Row code='styles={{chart:{opacity:.45}}}'>
          <PackageTrend package={PKG} data={data} width={170} styles={{ chart: { opacity: 0.45 } }} />
        </Row>
      </Group>

      <Group title="numberFormat · percentFormat" note="Intl.NumberFormat options, merged over the defaults.">
        <Row code='(default) compact, 1 decimal'>
          <PackageTrend package={PKG} data={data} variant="text" locale="en-GB" />
        </Row>
        <Row code='numberFormat={{notation:"standard"}}'>
          <PackageTrend package={PKG} data={data} variant="text" locale="en-GB"
            numberFormat={{ notation: "standard" }} />
        </Row>
        <Row code='numberFormat={{maximumFractionDigits:3}} percentFormat={{maximumFractionDigits:2}}'>
          <PackageTrend package={PKG} data={data} variant="text" locale="en-GB"
            numberFormat={{ maximumFractionDigits: 3 }} percentFormat={{ maximumFractionDigits: 2 }} />
        </Row>
        <Row code='locale="en-US"  — capital M'>
          <PackageTrend package={PKG} data={data} variant="text" locale="en-US" />
        </Row>
        <Row code='locale="de-DE"'>
          <PackageTrend package={PKG} data={data} variant="text" locale="de-DE" />
        </Row>
      </Group>

      <Group title="interactive" note="Pointer and arrow keys. The KPI headline follows the day under the pointer.">
        <Row code='interactive'>
          <span id="hover-kpi">
            <PackageTrend package={PKG} data={data} variant="kpi" locale="en-GB" interactive width={220} height={44} />
          </span>
        </Row>
        <Row code='interactive  — bare chart, focusable with Tab'>
          <PackageTrend package={PKG} data={data} interactive width={260} height={44} />
        </Row>
        <Row code='interactive chart="column" aggregate="week"'>
          <PackageTrend package={PKG} data={data} interactive chart="column" aggregate="week" width={200} height={44} />
        </Row>
      </Group>

      <Group title="aggregate month · explicit range" note="between() builds the YYYY-MM-DD:YYYY-MM-DD npm takes.">
        <Row code='aggregate="month"  (needs a year of data)'>
          <PackageTrend package={PKG} period="last-year" aggregate="month" chart="column" width={200} height={40} />
        </Row>
        <Row code='period={between("2026-06-01","2026-08-31")}'>
          <PackageTrend package={PKG} period={between("2026-06-01", "2026-08-31")} aggregate="week" width={200} />
        </Row>
      </Group>

      <Group title="analyse()" note="Everything you would need to write a sentence, without the chart.">
        <table>
          <tbody>
            <tr><td>direction</td><td>{a.direction}, {a.confidence} (r² {a.fit.rSquared.toFixed(3)})</td></tr>
            <tr><td>weeklyGrowth</td><td>{a.weeklyGrowth === null ? "n/a" : `${(a.weeklyGrowth * 100).toFixed(1)}%`}</td></tr>
            <tr><td>annualisedGrowth</td><td>{a.annualisedGrowth === null ? "n/a" : `${(a.annualisedGrowth * 100).toFixed(0)}%`}</td></tr>
            <tr><td>weekendRatio</td><td>{a.weekendRatio.toFixed(2)}</td></tr>
            <tr><td>busiest / quietest</td><td>{formatWeekday(a.busiestWeekday.weekday, "en-GB")} / {formatWeekday(a.quietestWeekday.weekday, "en-GB")}</td></tr>
            <tr><td>volatility</td><td>{(a.volatility * 100).toFixed(1)}%</td></tr>
            <tr><td>streak</td><td>{a.streak ? `${a.streak.weeks} weeks ${a.streak.direction}` : "none"}</td></tr>
            <tr><td>spikes</td><td>{a.spikes.length ? a.spikes.map((s) => `${s.day} (${s.sigma.toFixed(1)}σ)`).join(", ") : "none"}</td></tr>
            <tr><td>gapDays</td><td>{a.gapDays.length ? a.gapDays.join(", ") : "none"}</td></tr>
            <tr><td>peak / trough</td><td>{a.peak.day} / {a.trough.day}</td></tr>
          </tbody>
        </table>
      </Group>

      <Group title="on dark" note="No theme prop. The chart follows the text colour.">
        <div className="dark">
          <PackageTrend package={PKG} data={data} variant="kpi" colors={{ up: "#4ac98a" }} locale="en-GB" />
          <PackageTrend package={PKG} data={data} chart="column" aggregate="week" width={150} mark={["high"]} markColor={{ high: "#f0a070" }} />
          <PackageTrend package={PKG} data={data} width={150} fill="rgba(255,255,255,.12)" dot />
        </div>
      </Group>

      <footer>
        Weekly: {weekly.values.length} buckets · every figure from the raw series, only the line is shaped.
      </footer>
    </main>
  );
}

function App() {
  const [data, setData] = useState<DownloadRange | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDownloads(PKG, { period: "last-month" }).then(setData).catch((e) => setError(String(e)));
  }, []);

  if (error) return <main><p className="err">{error}</p></main>;
  if (!data) return <main><p className="note">Fetching {PKG}…</p></main>;
  return <Gallery data={data} />;
}

createRoot(document.getElementById("root")!).render(<App />);
