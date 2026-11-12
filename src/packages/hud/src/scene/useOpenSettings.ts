import { useMemo } from "react";

/** A card's Open Agent plugins hands over as the settings button does: the
 * hold ends, then the settings page opens through the sidebar's handover. */
export function useOpenSettings(
  openSettingsPage: ((page: string) => void) | undefined,
  endHold: () => void,
  handoff: (then: () => void) => void,
): ((page: string) => void) | undefined {
  return useMemo(
    () =>
      openSettingsPage
        ? (page: string) => {
            endHold();
            handoff(() => openSettingsPage(page));
          }
        : undefined,
    [openSettingsPage, endHold, handoff],
  );
}
