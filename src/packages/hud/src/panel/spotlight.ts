// The hover panel's jump to an agent's blocks (a tag or receipt opened it on
// one): scrolls there and lights them a moment. Moved out of HoverPanel.tsx
// for the 300-line ratchet.
import { useEffect, useRef, useState } from "react";
import { systemReducesMotion } from "@agent-hud/ui/lib/motion";
import { vendorKey } from "../model";

/** `moves`: the HUD's 动画 setting (the config's and the snapshot's). */
export function useSpotlight(spotlight: string | undefined, moves: boolean) {
  const scroller = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState<string | null>(null);
  // Read when it reaches, not when the spotlight came: 动画 turned off while
  // it settles jumps the rest of the way (ENG-17).
  const smooth = useRef(moves);
  smooth.current = moves;
  const reaching = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!moves) reaching.current?.();
  }, [moves]);
  useEffect(() => {
    setLit(null);
    const box = scroller.current;
    if (!spotlight || !box) return;
    const block = [
      ...box.querySelectorAll<HTMLElement>("[data-hud-block]"),
    ].find(
      (element) =>
        vendorKey(
          (element.dataset.hudBlock ?? "").replace(/^(api|sessions):/, ""),
        ) === spotlight,
    );
    if (!block) return;
    const reach = () => {
      const top =
        block.getBoundingClientRect().top -
        box.getBoundingClientRect().top +
        box.scrollTop -
        8;
      // Less motion (the system's or 动画 off) jumps there (ENG-04).
      const behavior =
        smooth.current && !systemReducesMotion() ? "smooth" : "auto";
      box.scrollTo({ top: Math.max(0, top), behavior });
    };
    reach();
    reaching.current = reach;
    // A board just grown from a peek gets its height capped a frame later;
    // only then can it scroll, so it reaches again as its size settles.
    const sized = new ResizeObserver(reach);
    sized.observe(box);
    setLit(block.dataset.hudBlock ?? null);
    const timer = setTimeout(() => {
      sized.disconnect();
      reaching.current = null;
      setLit(null);
    }, 1200);
    return () => {
      sized.disconnect();
      reaching.current = null;
      clearTimeout(timer);
    };
  }, [spotlight]);
  return { scroller, lit };
}
