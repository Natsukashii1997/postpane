// The round seal a news card presses beside its paper plane (待答 / 待批 /
// 切换 in red or green, 已回 in blue), kept from the list card's old head
// when the card took the agent's own head (owner chose 甲, 2026-11-14).
import { createContext, useContext } from "react";
import { PAPER_SEAL, usePaper } from "../paper";

export interface NewsSeal {
  words: string;
  ink: "red" | "blue" | "green";
}

/** The seal of the news the card holds; none on a plain panel. */
export const NewsSealContext = createContext<NewsSeal | null>(null);

export const useNewsSeal = () => useContext(NewsSealContext);

export function PaperSeal({ seal, zh }: { seal: NewsSeal; zh: boolean }) {
  const paper = usePaper();
  // In the notch there is no paper: the sections' counts say it.
  if (!paper) return null;
  return (
    <span
      aria-hidden="true"
      style={{
        width: 42,
        height: 42,
        boxSizing: "border-box",
        display: "grid",
        placeItems: "center",
        flex: "none",
        border: `2px solid ${paper[seal.ink]}`,
        borderRadius: "50%",
        color: paper[seal.ink],
        font: `900 ${zh ? 12 : 9}px/1 ${PAPER_SEAL}`,
        transform: "rotate(-14deg)",
        opacity: 0.85,
        pointerEvents: "none",
      }}
    >
      {seal.words}
    </span>
  );
}
