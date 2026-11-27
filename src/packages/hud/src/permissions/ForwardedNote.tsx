// What a finished session sent the owner to this session to do (owner,
// 2026-11-28, 「丙」): one line per such session, its name and its words, in
// the ochre of 「回」, words come back from another party.
import { usePaper, paperOf } from "../paper";

export function ForwardedNote({
  from,
  titleOf,
  light,
  zh,
}: {
  from: { sessionId: string; title: string; note: string }[];
  /** A session's title as the sidebar lists it. */
  titleOf?: (sessionId: string) => string | undefined;
  light: boolean;
  zh: boolean;
}) {
  const paper = usePaper() ?? paperOf(light);
  return (
    <>
      {from.map((line) => (
        <p
          key={line.sessionId}
          style={{
            margin: 0,
            fontSize: 12.5,
            lineHeight: 1.6,
            color: paper.ochre,
            borderLeft: `2px solid ${paper.ochre}`,
            paddingLeft: 8,
            overflowWrap: "anywhere",
          }}
        >
          {titleOf?.(line.sessionId) || line.title}
          {zh ? " 转来：" : " sent: "}
          {line.note}
        </p>
      ))}
    </>
  );
}
