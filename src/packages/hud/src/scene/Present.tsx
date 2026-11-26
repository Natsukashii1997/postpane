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

const stop = (event: SyntheticEvent) => {
  event.preventDefault();
  event.stopPropagation();
};
const letGo = (event: FocusEvent) => {
  if (event.target instanceof HTMLElement) event.target.blur();
};

/** What Tab can reach inside a view. */
const TABBABLE = "a[href], button, input, select, textarea, [tabindex]";

/** Props for a view that may be leaving: `inert` where WebKit knows it
 * (Safari 15.5, macOS 12.4, on). Before that the view does inert's work
 * itself: hidden from VoiceOver (`aria-hidden`), out of Tab's order (its
 * controls `tabindex=-1`: it is gone in a moment, nothing to put back),
 * swallowing clicks and keys on their way in, and letting go of any focus in
 * or reaching it. Where focus goes next is the page's, as when a view went at
 * once. */
export function useLeaving<E extends HTMLElement>() {
  const present = useIsPresent();
  const ref = useRef<E>(null);
  useLayoutEffect(() => {
    const view = ref.current;
    if (present || !view) return;
    for (const control of view.querySelectorAll<HTMLElement>(TABBABLE))
      control.tabIndex = -1;
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
        onFocusCapture: letGo,
      };
}

export function PresentButton(props: HTMLMotionProps<"button">) {
  return <motion.button {...props} {...useLeaving<HTMLButtonElement>()} />;
}

export function PresentDiv(props: HTMLMotionProps<"div">) {
  return <motion.div {...props} {...useLeaving<HTMLDivElement>()} />;
}
