// The dashed 「接力 n/m」 tag: on a session's row in 「正在进行」 (#121) and
// on ChatGPT's relay rows (#427), one look for both. Moved out of
// SessionsSection.tsx.
import type { Handoff } from "@agent-hud/protocol";
import { round } from "../alerts/handoff-card";
import { noButtonChrome } from "./theme";

export function RelayTag({
  handoff,
  zh,
  color,
  onClick,
}: {
  handoff: Handoff;
  zh: boolean;
  color: string;
  /** A button of its own on a session's row; part of the row elsewhere. */
  onClick?: () => void;
}) {
  const { at, of } = round(handoff);
  const style = {
    ...noButtonChrome,
    flex: "none",
    display: "inline-flex",
    alignItems: "center",
    height: 17,
    padding: "0 5px",
    boxSizing: "border-box",
    border: "1.5px dashed currentColor",
    borderRadius: 2,
    color,
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: "0.04em",
    lineHeight: 1,
    whiteSpace: "nowrap",
  } as const;
  const text = zh ? `接力 ${at}/${of}` : `Relay ${at}/${of}`;
  if (!onClick) return <span style={style}>{text}</span>;
  return (
    <button
      type="button"
      title={zh ? "打开接力卡" : "Open the handoff card"}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      style={{ ...style, cursor: "pointer" }}
    >
      {text}
    </button>
  );
}
