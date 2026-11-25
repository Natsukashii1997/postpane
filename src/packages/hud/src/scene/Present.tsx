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

/** Props for a view that may be leaving: `inert` where WebKit knows it
 * (Safari 15.5, macOS 12.4, on); before that the view also swallows clicks
 * and keys on their way in, and lets go of any focus in or reaching it. Where
 * focus goes next is the page's, as when a view went at once. */
export function useLeaving<E extends HTMLElement>() {
  const present = useIsPresent();
  const ref = useRef<E>(null);
  useLayoutEffect(() => {
    const held = document.activeElement;
    if (!present && held instanceof HTMLElement && ref.current?.contains(held))
      held.blur();
  }, [present]);
  return present
    ? { ref }
    : {
        ref,
        inert: true,
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
