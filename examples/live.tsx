// The gallery against a live fetch. The static build mounts the same component
// from a captured dataset; neither module mounts as a side effect of import.
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { fetchDownloads } from "../src/index.js";
import { Gallery, type Datasets } from "./options.tsx";

const PKG = "react";

function App() {
  const [sets, setSets] = useState<Datasets | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchDownloads(PKG, { period: "last-month" }),
      fetchDownloads(PKG, { period: "last-week" }),
      fetchDownloads(PKG, { period: "last-year" }),
    ])
      .then(([month, week, year]) => setSets({ month, week, year }))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <main><p className="err">{error}</p></main>;
  if (!sets) return <main><p className="note">Fetching {PKG}…</p></main>;
  return <Gallery {...sets} />;
}

createRoot(document.getElementById("root")!).render(<App />);
