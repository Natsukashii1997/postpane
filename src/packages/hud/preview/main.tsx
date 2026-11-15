// The scene preview (#349, ADR-0001): the sidebar's real HUDScene and hover
// panel on the fixed workplace scenes, so a layout change is checked here on
// every scene instead of in a one-off preview-xxx scaffold.
//   ?scene=<key>  one scene (default: the first)
//   ?panel        also open the hover panel beside the sidebar
//   ?light        light paper
//   ?still        report reduced motion, so a capture is never mid-animation (L-29)
import { useState } from "react";
import ReactDOM from "react-dom/client";
import "./preview.css";
import { FormatProvider } from "@agent-hud/ui/format-context";
import { HUDScene, HUDLogo } from "../src/HUDScene";
import { SourceHoverPanel } from "../src/HoverPanel";
import { defaultHUDConfig } from "../src/model";
import { PanelServicesProvider } from "../src/PanelContext";
import { openHandoffCard } from "../src/alerts/HandoffCard";
import { NOW } from "../test/scenes/build";
import { SCENES } from "../test/scenes/scenes";

// The scenes are written at one clock; the page runs at it too, so 「3 分钟前」
// reads the same on every visit.
const RealDate = Date;
const offset = NOW - RealDate.now();
class SceneDate extends RealDate {
  constructor(...args: ConstructorParameters<typeof Date> | []) {
    if (args.length) super(...(args as ConstructorParameters<typeof Date>));
    else super(RealDate.now() + offset);
  }
  static now() {
    return RealDate.now() + offset;
  }
}
globalThis.Date = SceneDate as DateConstructor;

const params = new URLSearchParams(location.search);
if (params.has("still")) {
  const real = window.matchMedia.bind(window);
  // A proxy keeps addEventListener and the rest: a spread copy drops them,
  // and the bots then fall back to still pictures.
  window.matchMedia = (q: string) => {
    const list = real(q);
    if (!q.includes("reduced-motion")) return list;
    return new Proxy(list, {
      get: (target, key) => {
        if (key === "matches") return true;
        const value = Reflect.get(target, key, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  };
}

const services = {
  openSession: async () => true,
  query: () => new Promise(() => {}),
  handoffAct: async () => {},
} as never;

function go(next: Record<string, string | null>) {
  const url = new URL(location.href);
  for (const [key, value] of Object.entries(next))
    if (value === null) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  location.href = url.toString();
}

function Preview() {
  const key = params.get("scene") ?? SCENES[0].key;
  const current = SCENES.find((s) => s.key === key) ?? SCENES[0];
  const light = params.has("light");
  const panel = params.has("panel");
  const [height] = useState(() => window.innerHeight - 56);
  const config = {
    ...defaultHUDConfig,
    mode: "logos",
    edge: "right",
    offset: 0.4,
    logoSize: 30,
    gapScale: 0.35,
    logoEdgeDistance: 2,
    botLogos: true,
    appearance: light ? "light" : "dark",
  } as typeof defaultHUDConfig;
  const button = (on: boolean) => ({
    font: "13px system-ui",
    padding: "4px 10px",
    border: "1px solid #888",
    borderRadius: 3,
    background: on ? "#22262b" : "transparent",
    color: on ? "#fff" : "#22262b",
    cursor: "pointer",
  });
  return (
    <FormatProvider
      setting="zh"
      quotaDisplay={current.snapshot.settings?.quotaDisplay}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          alignItems: "center",
          height: 56,
          padding: "0 12px",
          boxSizing: "border-box",
          borderBottom: "1px solid #ccc",
          overflowX: "auto",
        }}
      >
        {SCENES.map((s) => (
          <button
            key={s.key}
            title={s.title}
            style={button(s.key === current.key)}
            onClick={() => go({ scene: s.key })}
          >
            {s.key}
          </button>
        ))}
        <button
          style={button(panel)}
          onClick={() => go({ panel: panel ? null : "" })}
        >
          看板
        </button>
        <button
          style={button(light)}
          onClick={() => go({ light: light ? null : "" })}
        >
          浅色
        </button>
        <span
          data-scene-title
          style={{ font: "13px system-ui", color: "#555" }}
        >
          {current.title}
        </span>
      </div>
      <PanelServicesProvider value={services}>
        <div
          style={{
            position: "relative",
            width: "100vw",
            height,
            background: light ? "#d9d6cf" : "#1b2440",
          }}
        >
          {panel && (
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 72,
                width: 540,
                maxHeight: height - 24,
                overflow: "auto",
              }}
            >
              <SourceHoverPanel
                config={config}
                snapshot={current.snapshot}
                light={light}
                Logo={HUDLogo}
                active
              />
            </div>
          )}
          <HUDScene
            snapshot={current.snapshot}
            config={config}
            height={height}
            onRequestDecision={() => {}}
            // The foot's links do nothing here but say so (#378).
            onConfigure={() => console.info("[预览台] 打开设置")}
            onStats={() => console.info("[预览台] 打开统计")}
          />
        </div>
      </PanelServicesProvider>
    </FormatProvider>
  );
}

// For a capture script: open a relay's card by id, or close it.
Object.assign(window, { openCard: (id: string | null) => openHandoffCard(id) });

ReactDOM.createRoot(document.getElementById("root")!).render(<Preview />);
