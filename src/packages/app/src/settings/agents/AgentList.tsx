import { useState } from "react";
import type { Provider } from "@agent-hud/protocol";
import { HUDArtwork as HUDLogo } from "@agent-hud/hud/HUDArtwork";
import type { Text } from "../SettingsPrimitives";

/** PostPane's own agents, always on top in this order. */
const PINNED = ["claude", "codex", "hermes", "grok-bot"];

/** The pinned agents first; every other agent in a group that starts folded,
 * found ones first and the rest under a small label, still selectable so they
 * can be set up before they are installed. */
export function AgentList({
  t,
  providers,
  selected,
  select,
}: {
  t: Text;
  providers: Provider[];
  selected?: string;
  select: (id: string) => void;
}) {
  const pinned = PINNED.flatMap((id) =>
    providers.filter((provider) => provider.id === id),
  );
  const others = providers.filter((provider) => !PINNED.includes(provider.id));
  const found = others.filter((provider) => provider.detected);
  const missing = others.filter((provider) => !provider.detected);
  const [open, setOpen] = useState(() =>
    others.some((provider) => provider.id === selected),
  );
  const item = (provider: Provider) => (
    <button
      key={provider.id}
      type="button"
      className={`agents-list-item${provider.id === selected ? " is-selected" : ""}${provider.enabled ? "" : " is-off"}`}
      aria-current={provider.id === selected ? "true" : undefined}
      onClick={() => select(provider.id)}
    >
      <HUDLogo source={provider.id} size={18} />
      <span className="agents-list-name">{provider.name}</span>
      {!provider.enabled && (
        <span className="agents-list-state">{t("Off", "已关闭")}</span>
      )}
    </button>
  );
  return (
    <nav className="agents-list" aria-label={t("Agents", "智能体")}>
      {pinned.map(item)}
      {others.length > 0 && (
        <button
          type="button"
          className="agents-list-label agents-list-fold"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? "▾" : "▸"} {t("Other agents", "其他助手")} ({others.length})
        </button>
      )}
      {open && found.map(item)}
      {open && missing.length > 0 && (
        <>
          <div className="agents-list-label">
            {t("Not on this computer", "未在这台电脑上发现")}
          </div>
          {missing.map(item)}
        </>
      )}
    </nav>
  );
}
