// A reply opened on the waiting card (owner, 2026-11-28): its closing in
// small print (主线, 本次完成, 当前状态), then 下一步 large, then 「知道了」 at
// the bottom right, laid out as the ASK card is (PermissionQuestionCard).
// 知道了 puts the reply away from the sidebar and sends nothing.
import { X } from "lucide-react";
import { cardColumn } from "../card-column";
import { usePaper } from "../paper";
import { CardButton } from "./CardButton";
import { cardInks } from "./ListCard";
import { replyClosing } from "./reply-closing";

export function ReplyDetail({
  message,
  light,
  zh,
  dismiss,
}: {
  message: string;
  light: boolean;
  zh: boolean;
  /** Puts the reply away. */
  dismiss?: () => void;
}) {
  const paper = usePaper();
  const inks = cardInks(paper, light);
  const { lines, next } = replyClosing(message);
  return (
    <div style={cardColumn(8)}>
      {lines.length > 0 && (
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.7,
            marginBottom: 6,
            color: paper ? paper.text(0.76) : inks.mid,
            overflowWrap: "anywhere",
            whiteSpace: "pre-line",
          }}
        >
          {lines.map((line, index) => (
            <div key={index}>
              {line.label && (
                <span style={{ color: inks.dim }}>{line.label}：</span>
              )}
              {line.text}
            </div>
          ))}
        </div>
      )}
      {next && (
        <div style={cardColumn(4)}>
          <span
            style={{ fontSize: 11, letterSpacing: "0.04em", color: inks.dim }}
          >
            {zh ? "下一步" : "Next"}
          </span>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              lineHeight: 1.45,
              color: inks.ink,
              overflowWrap: "anywhere",
              whiteSpace: "pre-line",
            }}
          >
            {next}
          </div>
        </div>
      )}
      {dismiss && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <CardButton
            tone="secondary"
            light={light}
            icon={<X size={9} strokeWidth={2.6} />}
            onClick={dismiss}
          >
            {zh ? "知道了" : "Dismiss"}
          </CardButton>
        </div>
      )}
    </div>
  );
}
