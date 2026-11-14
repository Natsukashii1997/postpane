// The list card's head, shared by the waiting card (ApprovalContent) and the
// reply card (CompletionAlertView). Moved out of ListCard.tsx for the
// 300-line ratchet when the waiting card's head took the paper plane (#341).
import type { ReactNode } from "react";
import { PAPER_SEAL, type Paper } from "../paper";
import { ApprovalTag } from "./ApprovalTag";
import { tagCounts, tagTone, type ApprovalEntry } from "./approval-list";
import type { Inks } from "./ListCard";

/** The card's head: its spaced label, the count tags, and on paper the
 * stamp in the paper's `stampInk` (red for the waiting, blue for replies,
 * green for a handoff card's 切换, #245). */
export function ListHead({
  label,
  entries,
  stamp,
  stampInk,
  paper,
  inks,
  light,
  zh,
  action,
  toggle,
}: {
  label: string;
  entries: readonly ApprovalEntry[];
  stamp: string;
  stampInk: "red" | "blue" | "green";
  paper: Paper | null;
  inks: Inks;
  light: boolean;
  zh: boolean;
  /** What acts on the whole card, before the count tags (the reply card's
   * 全部知道了). */
  action?: ReactNode;
  /** The paper plane into a handoff, just left of the stamp (#341). */
  toggle?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        minHeight: 44,
        padding: "0 2px 8px 0",
      }}
    >
      <span
        style={{
          fontSize: 12.5,
          letterSpacing: zh ? "0.32em" : "0.12em",
          color: inks.dim,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginLeft: "auto",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {action}
        {tagCounts(entries).map(({ badge, count }) => (
          <ApprovalTag
            key={badge}
            label={badge}
            tone={tagTone(badge)}
            light={light}
            count={count}
            ink={inks.ink}
          />
        ))}
      </span>
      {toggle}
      {/* The receipt's stamp; in the notch the count tags say it. */}
      {paper && (
        <span
          aria-hidden="true"
          style={{
            width: 42,
            height: 42,
            boxSizing: "border-box",
            display: "grid",
            placeItems: "center",
            flex: "none",
            border: `2px solid ${paper[stampInk]}`,
            borderRadius: "50%",
            color: paper[stampInk],
            font: `900 ${zh ? 12 : 9}px/1 ${PAPER_SEAL}`,
            transform: "rotate(-14deg)",
            opacity: 0.85,
            pointerEvents: "none",
          }}
        >
          {stamp}
        </span>
      )}
    </div>
  );
}
