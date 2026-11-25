// A view in an AnimatePresence on its way out fades where it was for a
// moment; through that moment it is out of the keyboard's reach as well as
// the pointer's (`inert` also drops any focus held inside it), so a key
// press cannot act on what is leaving (ENG-07).
import { motion, useIsPresent, type HTMLMotionProps } from "motion/react";

export function PresentButton(props: HTMLMotionProps<"button">) {
  return <motion.button {...props} inert={!useIsPresent()} />;
}

export function PresentDiv(props: HTMLMotionProps<"div">) {
  return <motion.div {...props} inert={!useIsPresent()} />;
}
