// The handoff card's task line: the title, ↗ back to the doer's session and
// × back to what the sidebar showed. The × is the card's way out while the
// handoff runs: a request waiting for its answer keeps the sidebar from
// folding, and the foot has no 「知道了」 until the handoff ends (#334, the
// owner chose 乙 on 2026-11-14). Moved out of HandoffCard.tsx for the
// 300-line ratchet.
import { GoButton } from "../GoButton";
import type { Inks } from "../permissions/ListCard";

/** "驿窗｜接力" → ["驿窗", "接力"]; a title without the bar stays whole. */
function splitTitle(title: string): [string, string | null] {
  const at = title.indexOf("｜");
  return at > 0 ? [title.slice(0, at), title.slice(at + 1)] : [title, null];
}

export function HandoffTitleRow({
  title,
  doer,
  zh,
  inks,
  canGo,
  onGo,
  onClose,
}: {
  title: string;
  /** Who does the work: Claude, Codex. */
  doer: string;
  zh: boolean;
  inks: Inks;
  /** The doer's session is there to go back to. */
  canGo: boolean;
  onGo(): void;
  /** Back to what the sidebar showed before. */
  onClose(): void;
}) {
  const [task, rest] = splitTitle(title);
  const goInks = {
    line: inks.line,
    ink: inks.dim,
    faint: inks.faint,
    strong: inks.ink,
  };
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 26px 26px",
        columnGap: 6,
        alignItems: "center",
        paddingTop: 14,
      }}
    >
      <b
        title={title}
        style={{
          marginRight: 6,
          fontSize: 14,
          fontWeight: 600,
          color: inks.ink,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {task}
        {rest !== null && (
          <>
            <span style={{ color: inks.dim, fontWeight: 400 }}>｜</span>
            {rest}
          </>
        )}
      </b>
      <GoButton
        label={zh ? `回到 ${doer} 会话` : `Return to the ${doer} session`}
        enabled={canGo}
        inks={goInks}
        onClick={() => {
          if (canGo) onGo();
        }}
      />
      <GoButton
        icon="close"
        label={zh ? "返回" : "Back"}
        enabled
        inks={goInks}
        onClick={onClose}
      />
    </div>
  );
}
