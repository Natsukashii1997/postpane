import { useMemo } from "react";
import { useGround } from "../ground";
import { usePaper } from "../paper";
import { alertPalette, type AlertPalette } from "./alert-tones";

export type { AlertPalette } from "./alert-tones";

export function useAlertPalette(light: boolean): AlertPalette {
  const ground = useGround(light);
  const paper = usePaper();
  return useMemo(() => alertPalette(ground, paper), [ground, paper]);
}
