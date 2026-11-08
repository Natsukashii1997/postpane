import { useEffect, useRef } from "react";
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
import { SIDE_TAG_REST_MS } from "./side-tag-stack";
import { narrowTagSize, tagGap } from "./tag-fold";

const horizontal = (edge: HUDEdge) => edge === "top" || edge === "bottom";

type SideTagPlace = {
  side: SideNews;
  rect: HUDRect;
  narrow: boolean;
  slip: HUDRect | null;
};

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
    folded = () => null,
  }: {
    screen: { width: number; height: number };
    strip: HUDRect;
    edge: HUDEdge;
    centers: readonly number[];
    scale: number;
    zh: boolean;
    quotaDisplay?: QuotaDisplay;
    sessions: readonly Session[];
    /** A waiting tag past its five seconds: drawn as its narrow slip, or
     * open whole under the pointer (#243). */
    folded?: (side: SideNews) => "narrow" | "open" | null;
  },
): SideTagPlace[] {
  return sides.flatMap((side): SideTagPlace[] => {
    const center = centers[side.mark];
    if (center == null) return [];
    const along = (horizontal(edge) ? strip.x : strip.y) + center;
    const fold = folded(side);
    // Where its narrow slip stands against the stub.
    const slip = fold
      ? cardRect(
          screen,
          strip,
          edge,
          narrowTagSize(scale, edge),
          true,
          along,
          tagGap(true),
        )
      : null;
    if (fold === "narrow" && slip)
      return [{ side, rect: slip, narrow: true, slip }];
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
      along,
    );
    return [{ side, rect, narrow: false, slip }];
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
  tags: readonly { side: SideNews; rect: HUDRect; narrow?: boolean }[];
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
  // Only a pointer resting on a tag brings its agent forward (#238).
  const resting = useRef<ReturnType<typeof setTimeout>>(undefined);
  const stopResting = () => clearTimeout(resting.current);
  useEffect(() => stopResting, []);
  return (
    <>
      {tags.map(({ side, rect, narrow }) => (
        <div
          key={side.vendor}
          className="hud-side-tag"
          onPointerEnter={() => {
            stopResting();
            resting.current = setTimeout(
              () => onFront(side.id),
              SIDE_TAG_REST_MS,
            );
          }}
          onPointerLeave={stopResting}
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
            narrow={narrow}
            across={horizontal(edge)}
          />
        </div>
      ))}
    </>
  );
}
