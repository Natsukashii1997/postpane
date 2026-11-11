import { tagColor, type TagTone } from "./approval-list";

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

/**
 * The waiting card's one tag: a thin box in the tone's colour around a short
 * bold label (ASK, BASH, REPLY), with a count beside it in the ink where one
 * is given. A question's heading (such as 下一步) is the same box, dashed,
 * in the colour of the request it belongs to.
 */
export function ApprovalTag({
  label,
  tone,
  light,
  count,
  dashed = false,
  ink,
  color: own,
}: {
  label: string;
  tone: TagTone;
  light: boolean;
  count?: number;
  dashed?: boolean;
  /** The count's colour: the card's ink. */
  ink?: string;
  /** A colour of its own, for a tag outside the waiting card (the hover
   * panel's 等你 and plan tags); the tone's otherwise. */
  color?: string;
}) {
  const color = own ?? tagColor(tone, light);
  // Letters print in the narrow mono face; words such as 下一步 in the
  // card's own.
  const latin = /^[\x20-\x7e]*$/.test(label);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 18,
        boxSizing: "border-box",
        padding: "0 6px",
        border: `1.5px ${dashed ? "dashed" : "solid"} ${color}`,
        borderRadius: 2,
        color,
        fontFamily: latin ? MONO : undefined,
        fontSize: latin ? 10.5 : 11,
        fontWeight: 700,
        letterSpacing: latin ? "0.08em" : "0.04em",
        lineHeight: 1,
        whiteSpace: "nowrap",
        flex: "none",
      }}
    >
      {label}
      {count !== undefined && (
        <b
          style={{
            fontWeight: 700,
            color: ink,
            letterSpacing: 0,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {count}
        </b>
      )}
    </span>
  );
}
