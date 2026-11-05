import type { IslandEvent, Snapshot } from "@agent-hud/protocol";
import { AlertStrip, useStripCopy } from "./QuotaAlertViews";

/** Quota news inside the open usage panel (Open QuotaAlertInlineView): the
 * card's strip, with the same words and colours, but no bar and no close.
 * Opening it shows the usage. */
export function InlineEventRow({
  event,
  snapshot,
  light = false,
  botLogos = true,
  zh = false,
  onOpen,
}: {
  event: IslandEvent;
  snapshot: Snapshot;
  light?: boolean;
  botLogos?: boolean;
  zh?: boolean;
  onOpen?: () => void;
}) {
  const copy = useStripCopy(event, snapshot, zh);
  return (
    <AlertStrip
      event={event}
      copy={copy}
      first
      onOpen={onOpen}
      bar={false}
      light={light}
      botLogos={botLogos}
      zh={zh}
    />
  );
}
