// The same gallery, rendered from a captured dataset instead of a live fetch,
// for somewhere that cannot reach api.npmjs.org.
import { createRoot } from "react-dom/client";
import { Gallery, type Datasets } from "./options.tsx";
import sample from "./sample.json";

createRoot(document.getElementById("root")!).render(<Gallery {...(sample as unknown as Datasets)} source="snapshot" />);
