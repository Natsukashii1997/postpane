// A view in an AnimatePresence on its way out fades where it was for a
// moment; through that moment it is out of the keyboard's reach as well as
// the pointer's, so a key press cannot act on what is leaving (ENG-07).
import {
  useLayoutEffect,
  useRef,
  type FocusEvent,
  type SyntheticEvent,
} from "react";
import { motion, useIsPresent, type HTMLMotionProps } from "motion/react";

/** A click or key on its way in: it does nothing here. */
const stop = (event: SyntheticEvent) => {
  event.preventDefault();
  event.stopPropagation();
};
/** A press, drag or wheel on its way in: no row's gesture starts (ENG-19).
 * Not held back by default, so the page still scrolls and selects. */
const halt = (event: SyntheticEvent) => event.stopPropagation();
const letGo = (event: FocusEvent) => {
  if (event.target instanceof HTMLElement) event.target.blur();
};

/** What Tab can reach: the view itself (a peek is one button) or inside it. */
const TABBABLE = "a[href], button, input, select, textarea, [tabindex]";

/** The view and what Tab reaches in it, each with the tabindex it had. */
function outOfTabs(view: HTMLElement): [HTMLElement, string | null][] {
  const controls = [view, ...view.querySelectorAll<HTMLElement>(TABBABLE)]
    .filter((control) => control.matches(TABBABLE))
    .map((control): [HTMLElement, string | null] => [
      control,
      control.getAttribute("tabindex"),
    ]);
  for (const [control] of controls) control.tabIndex = -1;
  return controls;
}

/** Back as they were: a view called back before it was gone (same key). */
function backInTabs(controls: [HTMLElement, string | null][]) {
  for (const [control, was] of controls)
    if (was === null) control.removeAttribute("tabindex");
    else control.setAttribute("tabindex", was);
}

/** Props for a view that may be leaving: `inert` where WebKit knows it
 * (Safari 15.5, macOS 12.4, on). Before that the view does inert's work
 * itself: hidden from VoiceOver (`aria-hidden`); out of Tab's order, itself
 * and its controls (`tabindex=-1`, put back if it is called back before it
 * is gone); swallowing clicks and keys, and keeping presses, drags and the
 * wheel from the rows inside it; letting go of any focus in or reaching it.
 * Where focus goes next is the page's, as when a view went at once. */
export function useLeaving<E extends HTMLElement>() {
  const present = useIsPresent();
  const ref = useRef<E>(null);
  const taken = useRef<[HTMLElement, string | null][]>([]);
  useLayoutEffect(() => {
    const view = ref.current;
    if (!view) return;
    if (present) {
      backInTabs(taken.current);
      taken.current = [];
      return;
    }
    taken.current = outOfTabs(view);
    const held = document.activeElement;
    if (held instanceof HTMLElement && view.contains(held)) held.blur();
  }, [present]);
  return present
    ? { ref }
    : {
        ref,
        inert: true,
        "aria-hidden": true,
        onClickCapture: stop,
        onKeyDownCapture: stop,
        onPointerDownCapture: halt,
        onPointerMoveCapture: halt,
        onPointerUpCapture: halt,
        onPointerCancelCapture: halt,
        onWheelCapture: halt,
        onFocusCapture: letGo,
      };
}

export function PresentButton(props: HTMLMotionProps<"button">) {
  return <motion.button {...props} {...useLeaving<HTMLButtonElement>()} />;
}

export function PresentDiv(props: HTMLMotionProps<"div">) {
  return <motion.div {...props} {...useLeaving<HTMLDivElement>()} />;
}
