import React from "react";
import ReactDOM from "react-dom/client";
import "@agent-hud/app/styles.css";
import App from "@agent-hud/app";
import { installScrollThumbs } from "@agent-hud/ui/lib/scroll-thumbs";

installScrollThumbs();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <React.Suspense fallback={null}>
      <App />
    </React.Suspense>
  </React.StrictMode>,
);
