// The head of an agent's board block (issue #52): its mark and name, its
// plan, the stamp saying whether its quotas last, and the white paper plane
// into the relays it takes part in, left of the stamp (#344, ADR-0001 C2).
import type { Handoff } from "@agent-hud/protocol";
import { useFormat } from "@agent-hud/ui/format-context";
import { PAPER_SEAL, usePaper } from "../paper";
import { ApprovalTag } from "../permissions/ApprovalTag";
import { agentArtworkKey, agentVendorName } from "../agent-artwork";
import { EnterRelay } from "../alerts/RelayToggle";
import { relaysOf } from "../workspace";
import type { Logo } from "./theme";
import type { BoardStamp } from "./agent-board";
import { useBoardInks } from "./AgentBoard";

/** The resting strip's stub paper on a dark screen (HUDMarkStrip). */
const STUB_PAPER = "#e9e6de";

const STAMP_WORDS = {
  enough: {
    zh: "够用",
    en: "OK",
    zhAria: "额度够用",
    enAria: "Quota is enough",
  },
  tight: {
    zh: "吃紧",
    en: "TIGHT",
    zhAria: "额度吃紧",
    enAria: "Quota is tight",
  },
  unknown: {
    zh: "未知",
    en: "N/A",
    zhAria: "额度情况未知",
    enAria: "Quota outlook unknown",
  },
  duty: {
    zh: "在岗",
    en: "ON",
    zhAria: "机器人都在线",
    enAria: "Every bot is online",
  },
  down: {
    zh: "断线",
    en: "DOWN",
    zhAria: "有机器人断线",
    enAria: "A bot is down",
  },
} as const;

/** The 够用 / 吃紧 / 未知 (or 在岗 / 断线) stamp: a ring tilted like a rubber
 * stamp. */
function Stamp({ kind, light }: { kind: BoardStamp; light: boolean }) {
  const inks = useBoardInks(light);
  const zh = useFormat().language === "zh";
  const color =
    kind === "tight" || kind === "down"
      ? inks.red
      : kind === "enough" || kind === "duty"
        ? inks.green
        : inks.hatch;
  const words = STAMP_WORDS[kind];
  const label = zh ? words.zh : words.en;
  return (
    <span
      role="img"
      aria-label={zh ? words.zhAria : words.enAria}
      style={{
        width: 44,
        height: 44,
        flex: "none",
        boxSizing: "border-box",
        border: `2px solid ${color}`,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        color,
        fontFamily: zh ? PAPER_SEAL : undefined,
        fontSize: zh ? 13 : 10.5,
        fontWeight: 700,
        letterSpacing: zh ? 0 : "0.06em",
        transform: "rotate(-14deg)",
      }}
    >
      {label}
    </span>
  );
}

/** The board's head: the agent's mark and name, its plan, and the stamp. */
export function BoardHeading({
  vendor,
  Logo,
  light,
  plan,
  stamp,
  handoffs,
}: {
  vendor: string;
  Logo: Logo;
  light: boolean;
  plan?: string | null;
  stamp?: BoardStamp | null;
  handoffs?: readonly Handoff[];
}) {
  const inks = useBoardInks(light);
  const paper = usePaper();
  const zh = useFormat().language === "zh";
  const portraitChip =
    agentArtworkKey(vendor) === "hermes" && !(paper ? paper.light : light);
  return (
    <div
      className="hud-source-provider-heading"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        minHeight: 48,
        paddingBottom: 6,
        // A tear under the head, from one side of the paper to the other.
        ...(paper
          ? {
              borderBottom: `1.2px dashed ${paper.line}`,
              marginLeft: -paper.bleed.left,
              marginRight: -paper.bleed.right,
              paddingLeft: paper.bleed.left + 6,
              paddingRight: paper.bleed.right + 6,
            }
          : {
              boxShadow: `inset 0 -1px 0 ${inks.divider}`,
              paddingLeft: 6,
              paddingRight: 6,
            }),
      }}
    >
      {portraitChip ? (
        // Hermes is a black-haired girl drawn in ink: on dark paper she sits
        // on a slip of the strip's light stub paper (owner, 2026-11-06).
        <span
          style={{
            display: "inline-grid",
            placeItems: "center",
            flex: "none",
            width: 24,
            height: 24,
            borderRadius: 5,
            background: STUB_PAPER,
          }}
        >
          <Logo source={vendor} size={20} light />
        </span>
      ) : (
        <span style={{ display: "inline-flex", flex: "none" }}>
          <Logo source={vendor} size={20} light={light} />
        </span>
      )}
      <strong style={{ fontSize: 15, fontWeight: 600, color: inks.text }}>
        {agentVendorName(vendor)}
      </strong>
      {plan && (
        <ApprovalTag
          label={plan.toUpperCase()}
          tone="permission"
          light={light}
          color={inks.secondary}
        />
      )}
      <span style={{ flex: 1 }} />
      <EnterRelay handoffs={relaysOf(handoffs, vendor)} paper={paper} zh={zh} />
      {stamp && <Stamp kind={stamp} light={light} />}
    </div>
  );
}
