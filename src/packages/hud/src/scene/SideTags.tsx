import type { Session } from "@agent-hud/protocol";
import type { QuotaDisplay } from "@agent-hud/ui/format";
import {
  CompactAlertView,
  compactAlertDockWidth,
  clientDisplayName,
} from "../IslandNews";
import type { SideNews } from "../IslandNews";
import { replyChip } from "../alerts/reply-list";
import { cardRect, type HUDRect } from "../geometry";
import type { HUDEdge } from "../model";
import { paperFace, perforatedSide, perforation, type Paper } from "../paper";

const horizontal = (edge: HUDEdge) => edge === "top" || edge === "bottom";

/** Where each other agent's tag hangs: by its own mark, as the first tag
 * hangs by its sender's (#162). */
export function sideTagRects(
  sides: readonly SideNews[],
  {
    screen,
    strip,
    edge,
    centers,
    scale,
    zh,
    quotaDisplay,
    sessions,
  }: {
    screen: { width: number; height: number };
    strip: HUDRect;
    edge: HUDEdge;
    centers: readonly number[];
    scale: number;
    zh: boolean;
    quotaDisplay?: QuotaDisplay;
    sessions: readonly Session[];
  },
): { side: SideNews; rect: HUDRect }[] {
  return sides.flatMap((side) => {
    const center = centers[side.mark];
    if (center == null) return [];
    const width = compactAlertDockWidth(
      side.request,
      side.event,
      side.requests.length,
      scale,
      zh,
      sideReply(side, sessions),
      quotaDisplay,
      sessions,
    );
    const rect = cardRect(
      screen,
      strip,
      edge,
      { width: Math.min(width, screen.width), height: 26 * scale },
      true,
      (horizontal(edge) ? strip.x : strip.y) + center,
    );
    return [{ side, rect }];
  });
}

const sideReply = (side: SideNews, sessions: readonly Session[]) =>
  replyChip(side.replies, sessions as Session[], (each) =>
    clientDisplayName(each.source),
  );

/** The other agents' tags, each printed on the same paper as the first
 * one's; resting on one brings its agent to the front. */
export function SideTags({
  tags,
  edge,
  scale,
  paper,
  light,
  botLogos,
  zh,
  notchWidth,
  sessions,
  onFront,
}: {
  tags: readonly { side: SideNews; rect: HUDRect }[];
  edge: HUDEdge;
  scale: number;
  paper: Paper;
  light: boolean;
  botLogos: boolean;
  zh: boolean;
  notchWidth: number;
  sessions: readonly Session[];
  onFront: (id: string) => void;
}) {
  const punched = perforation(perforatedSide(edge), 10 * scale, 2.1 * scale);
  return (
    <>
      {tags.map(({ side, rect }) => (
        <div
          key={side.vendor}
          className="hud-side-tag"
          onPointerEnter={() => onFront(side.id)}
          style={{
            position: "absolute",
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
            zIndex: 1,
            pointerEvents: "auto",
            borderRadius: 3,
            filter: "drop-shadow(0 5px 10px rgba(0,0,0,.28))",
            color: paper.ink,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 3,
              ...paperFace(paper),
              WebkitMask: punched,
              mask: punched,
            }}
          />
          <CompactAlertView
            request={side.request}
            event={side.event}
            requestCount={side.requests.length}
            onDock
            notchWidth={notchWidth}
            surfaceFlare={0}
            scale={scale}
            light={light}
            botLogos={botLogos}
            zh={zh}
            paper={paper}
            reply={sideReply(side, sessions)}
            sessions={sessions}
            onOpen={() => onFront(side.id)}
            onDismissAndStats={() => onFront(side.id)}
          />
        </div>
      ))}
    </>
  );
}
