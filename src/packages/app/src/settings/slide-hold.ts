// A Settings slider's knob while it is held. The value it is drawn from is
// the saved one, which comes back only after the save's round trip, so the
// knob drawn from it lags the pointer, and a save from earlier in the drag
// that answers late pulls it back. While held (and after letting go, until
// its own value comes back) the knob shows the pointer's value instead.
import { useEffect, useReducer } from "react";

export type SlideHold = { local: number | null; dragging: boolean };
export type SlideEvent =
  | { type: "move"; value: number }
  | { type: "commit"; value: number }
  | { type: "stored"; value: number }
  | { type: "timeout" };

export const idleSlide: SlideHold = { local: null, dragging: false };

const same = (a: number, b: number) => Math.abs(a - b) < 1e-9;

export function slideHold(state: SlideHold, event: SlideEvent): SlideHold {
  switch (event.type) {
    case "move":
      return { local: event.value, dragging: true };
    case "commit":
      return { local: event.value, dragging: false };
    case "stored":
      return !state.dragging &&
        state.local !== null &&
        same(state.local, event.value)
        ? idleSlide
        : state;
    case "timeout":
      return state.dragging ? state : idleSlide;
  }
}

export function shownValue(state: SlideHold, stored: number): number {
  return state.local ?? stored;
}

/** How long a let-go knob waits for its value to come back before it shows
 * the store again (a save that failed, or a value the store clamped). */
const patience = 1500;

/** The value to draw a slider at, and the handlers that keep it with the
 * pointer. Saving is left to the caller, exactly as often as before. */
export function useSlideHold(stored: number) {
  const [hold, dispatch] = useReducer(slideHold, idleSlide);
  useEffect(() => dispatch({ type: "stored", value: stored }), [stored, hold]);
  useEffect(() => {
    if (hold.dragging || hold.local === null) return;
    const timer = window.setTimeout(
      () => dispatch({ type: "timeout" }),
      patience,
    );
    return () => window.clearTimeout(timer);
  }, [hold]);
  return {
    value: shownValue(hold, stored),
    move: (value: number) => dispatch({ type: "move", value }),
    commit: (value: number) => dispatch({ type: "commit", value }),
  };
}
