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
/** A press, drag or wheel on its way in: no row's gesture starts or moves
 * (ENG-19). A release and a cancel still go through, so a gesture begun
 * before the view started leaving ends as it always does (the tray settles);
 * nothing in the sidebar acts on a release. Not held back by default, so
 * the page still scrolls and selects. */
const halt = (event: SyntheticEvent) => event.stopPropagation();
const letGo = (event: FocusEvent) => {
  if (event.target instanceof HTMLElement) event.target.blur();
};

/** WebKit knows `inert` (Safari 15.5, macOS 12.4, on): it does it all. */
const KNOWS_INERT =
  typeof HTMLElement !== "undefined" && "inert" in HTMLElement.prototype;

/** What Tab can reach: the view itself (a peek is one button) or inside it. */
const TABBABLE = "a[href], button, input, select, textarea, [tabindex]";

/** Keeps a leaving view out of Tab's order where WebKit has no `inert`, and
 * gives back on `release` the tabindex each control should have now. While
 * it leaves, React may still draw: a tabindex it writes is what the control
 * should have once back (it is taken out again till then), and a control it
 * adds is taken out as well (ENG-07). */
function outOfTabs(view: HTMLElement) {
  const was = new Map<HTMLElement, string | null>();
  const take = (control: HTMLElement) => {
    if (!was.has(control)) was.set(control, control.getAttribute("tabindex"));
    control.tabIndex = -1;
  };
  const sweep = (root: HTMLElement) => {
    for (const control of [
      root,
      ...root.querySelectorAll<HTMLElement>(TABBABLE),
    ])
      if (control.matches(TABBABLE)) take(control);
  };
  const note = (changes: MutationRecord[]) => {
    const written = new Set<HTMLElement>();
    const added: HTMLElement[] = [];
    for (const change of changes)
      if (change.type === "childList") {
        for (const node of change.addedNodes)
          if (node instanceof HTMLElement) added.push(node);
      } else if (change.target instanceof HTMLElement)
        written.add(change.target);
    // React wrote these: what each has now is what it should have once back.
    // Read them all before writing any, so one written twice in a batch keeps
    // React's last value, not the -1 put on it a record earlier (ENG-07).
    for (const control of written)
      was.set(control, control.getAttribute("tabindex"));
    for (const control of written) control.tabIndex = -1;
    for (const node of added) sweep(node);
  };
  const watch = new MutationObserver((changes) => {
    note(changes);
    watch.takeRecords(); // our own writes just now, not React's
  });
  sweep(view);
  watch.observe(view, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["tabindex"],
  });
  return () => {
    // What React wrote in the commit that calls the view back is still
    // queued: take it first, or the old value would win.
    note(watch.takeRecords());
    watch.disconnect();
    for (const [control, value] of was)
      if (value === null) control.removeAttribute("tabindex");
      else control.setAttribute("tabindex", value);
  };
}

/** Props for a view that may be leaving: `inert` where WebKit knows it.
 * Before that (macOS 12.0 to 12.3) the view does inert's work itself: hidden
 * from VoiceOver (`aria-hidden`); out of Tab's order, itself and what is in
 * it (`outOfTabs`, given back if it is called back before it is gone, with
 * the same key); swallowing clicks and keys and keeping new presses, drags
 * and the wheel from the rows; letting go of any focus in or reaching it.
 * Where focus goes next is the page's, as when a view went at once. */
export function useLeaving<E extends HTMLElement>() {
  const present = useIsPresent();
  const ref = useRef<E>(null);
  useLayoutEffect(() => {
    const view = ref.current;
    if (present || !view) return;
    const held = document.activeElement;
    if (held instanceof HTMLElement && view.contains(held)) held.blur();
    return KNOWS_INERT ? undefined : outOfTabs(view);
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
