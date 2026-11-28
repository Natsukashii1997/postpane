// The slider row of Settings, split from SettingsPrimitives (which still
// exports it) with the hold that keeps its knob under the pointer.
import { Slider } from "@agent-hud/ui/components/slider";
import { useSlideHold } from "./slide-hold";

/** A slider row: the name on the left, the slider flush right with its
 * value printed over the knob. */
export function Slide({
  title,
  value: stored,
  min,
  max,
  step,
  change,
  format,
  disabled = false,
}: {
  title: string;
  value: number;
  min: number;
  max: number;
  step: number;
  change: (value: number) => void;
  format: (value: number) => string;
  disabled?: boolean;
}) {
  // The knob goes with the pointer; the saved value catches up behind it.
  const held = useSlideHold(stored);
  const value = held.value;
  const at =
    max > min
      ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
      : 0;
  return (
    <div className="settings-row settings-slider-row">
      <div className="settings-row-main">
        <div className="settings-row-text">
          <label className="settings-row-title">{title}</label>
        </div>
        <div className="settings-row-control">
          <span className="settings-slide">
            <Slider
              aria-label={title}
              min={min}
              max={max}
              step={step}
              value={[value]}
              disabled={disabled}
              onValueChange={([next]) => (held.move(next), change(next))}
              onValueCommit={([next]) => held.commit(next)}
              className="settings-slider"
            />
            {/* Where Radix puts the 14 pt knob: kept inside the track, so
                half a knob in at either end. */}
            <output
              className="settings-slider-value"
              style={{ left: `calc(${at}% + ${7 - at * 0.14}px)` }}
            >
              {format(value)}
            </output>
          </span>
        </div>
      </div>
    </div>
  );
}
