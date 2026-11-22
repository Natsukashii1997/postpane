import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { call, listenTo } from "./native.ts";

interface WindowActivity {
  active: boolean;
}

/** Native hide/minimize is not reliably reflected by document.hidden in WKWebView. */
export function useWindowActivity(track = true) {
  const [active, setActive] = useState(() =>
    track ? !isTauri() && !document.hidden : true,
  );
  useEffect(() => {
    if (!track) return;
    if (!isTauri()) {
      const changed = () => setActive(!document.hidden);
      changed();
      document.addEventListener("visibilitychange", changed);
      return () => document.removeEventListener("visibilitychange", changed);
    }
    let disposed = false;
    let revision = 0;
    const subscription = listenTo<WindowActivity>(
      "window:activity",
      ({ payload }) => {
        if (disposed) return;
        revision += 1;
        setActive(payload.active);
      },
      {
        target: {
          kind: "WebviewWindow",
          label: getCurrentWebviewWindow().label,
        },
      },
    );
    void subscription
      .then(async () => {
        if (disposed) return;
        const before = revision;
        const state = await call<WindowActivity>("window_activity");
        if (!disposed && before === revision) setActive(state.active);
      })
      .catch((failure: unknown) => {
        if (!disposed) console.warn("Window activity is unavailable", failure);
      });
    return () => {
      disposed = true;
      void subscription.then(
        (unlisten) => unlisten(),
        () => {},
      );
    };
  }, [track]);
  return track ? active : true;
}
