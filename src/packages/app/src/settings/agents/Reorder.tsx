import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@agent-hud/ui/components/button";
import type { Text } from "../SettingsPrimitives";

/** Rows that slide to their new places when the order changes. */
export { useFlip } from "../../lib/Motion";

/** `order` with `from` taken out and put back just before `to`: where a
 * dragged row dropped on another lands. */
export function moveBefore(order: string[], from: string, to: string) {
  const values = order.filter((key) => key !== from);
  values.splice(values.indexOf(to), 0, from);
  return values;
}

/** Swaps `id` with its neighbour among `visible`, inside the full `order`
 * (which may keep ids that are not on screen, so their places survive a
 * failed read). Returns `order` unchanged at either end. */
export function moveAmong(
  order: string[],
  visible: string[],
  id: string,
  direction: -1 | 1,
) {
  const at = visible.indexOf(id);
  const neighbour = visible[at + direction];
  if (at < 0 || !neighbour) return order;
  const next = [...order];
  const left = next.indexOf(id),
    right = next.indexOf(neighbour);
  if (left < 0 || right < 0) return order;
  [next[left], next[right]] = [next[right], next[left]];
  return next;
}

/** Up and down icon buttons for one item of a list. `name` finishes the
 * buttons' spoken labels ("Move up Current session"). */
export function ReorderButtons({
  t,
  name,
  first,
  last,
  disabled = false,
  move,
}: {
  t: Text;
  name: string;
  first: boolean;
  last: boolean;
  disabled?: boolean;
  move: (direction: -1 | 1) => void;
}) {
  return (
    <span className="settings-move">
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`${t("Move up", "上移")} ${name}`}
        disabled={disabled || first}
        onClick={() => move(-1)}
      >
        <ChevronUp size={13} />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`${t("Move down", "下移")} ${name}`}
        disabled={disabled || last}
        onClick={() => move(1)}
      >
        <ChevronDown size={13} />
      </Button>
    </span>
  );
}
