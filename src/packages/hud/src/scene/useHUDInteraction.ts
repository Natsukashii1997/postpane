import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from "react";
import type { Approval, IslandEvent } from "@agent-hud/protocol";
import type { HUDRect, StripMetrics } from "../geometry";
import { RETRY_AFTER_MS, openThenPutAway } from "../open-result";
import {
  vendorKey,
  type HUDConfig,
  type HUDEdge,
  type HUDVendor,
} from "../model";
import { clickMayPin, hoverMayOpen, onSidebar } from "../request-hover";
import type { HUDDragPreview } from "./useHUDDrag";

/** Native input is authoritative while a transparent host toggles mouse passthrough. */
export interface HUDNativePointer {
  inside: boolean;
  point: { x: number; y: number } | null;
  buttons: number | null;
  altKey: boolean | null;
  ctrlKey: boolean | null;
  metaKey: boolean | null;
  shiftKey: boolean | null;
}

const horizontal = (edge: HUDEdge) => edge === "top" || edge === "bottom";

export interface UseHUDInteractionArgs {
  config: HUDConfig;
  edge: HUDEdge;
  strip: HUDRect;
  metrics: StripMetrics;
  vendors: HUDVendor[];
  width: number;
  height: number;
  scene: RefObject<HTMLElement | null>;
  open: boolean;
  hoverPhase?: string;
  hovered: string | null;
  pinned: boolean;
  pointerInside: boolean;
  dragVisual: boolean;
  dragPreview?: HUDDragPreview | null;
  dragCandidate: MutableRefObject<{ armed: boolean; started: boolean } | null>;
  suppressDragClick: MutableRefObject<boolean>;
  suppressHover: MutableRefObject<boolean>;
  hoverInside: MutableRefObject<boolean>;
  enter: () => void;
  leave: () => void;
  forceOpen: () => void;
  collapse: () => void;
  setHovered: (value: string | null) => void;
  setPinned: (value: boolean) => void;
  setExpanded: (value: boolean) => void;
  setPointerInside: (value: boolean) => void;
  request?: Approval;
  event?: IslandEvent;
  inUsagePanel?: boolean;
  typing?: boolean;
  nativePointer?: HUDNativePointer;
  /** Open Settings and Statistics; each may resolve, or reject with why it
   * could not open. */
  onConfigure?: () => unknown;
  onStats?: () => unknown;
  /** Escape only ends an agent's edit hold; the panel is left to the hover. */
  onEscape?: () => void;
}

export function useHUDInteraction({
  config,
  edge,
  strip,
  metrics,
  vendors,
  width,
  height,
  scene,
  open,
  hoverPhase,
  hovered,
  pinned: _pinned,
  pointerInside,
  dragVisual,
  dragPreview,
  dragCandidate,
  suppressDragClick,
  suppressHover,
  hoverInside,
  enter,
  leave,
  forceOpen,
  collapse,
  setHovered,
  setPinned,
  setExpanded,
  setPointerInside,
  request,
  event,
  inUsagePanel = false,
  typing = false,
  nativePointer,
  onConfigure,
  onStats,
  onEscape,
}: UseHUDInteractionArgs) {
  const lastAlertId = useRef<string | null>(null);
  const lastAlertInUsagePanel = useRef(false);
  const activeAlertId = (request ?? event)?.id ?? null;

  useEffect(() => {
    if (activeAlertId !== null) {
      lastAlertInUsagePanel.current = Boolean(inUsagePanel);
    }
  }, [activeAlertId, inUsagePanel]);

  useEffect(() => {
    if (typing) {
      forceOpen();
    } else if (!pointerInside) {
      leave();
    }
  }, [typing]);

  useEffect(() => {
    if (open) return;
    setPinned(false);
    setExpanded(false);
  }, [open, setPinned, setExpanded]);

  useEffect(() => {
    collapse();
    setPinned(false);
    setExpanded(false);
    setHovered(null);
  }, [config.mode, config.edge]);

  useEffect(() => {
    const previousId = lastAlertId.current;
    if (activeAlertId === previousId) return;
    lastAlertId.current = activeAlertId;
    if (activeAlertId !== null) {
      // ScreenHUD.present: cancel a pending hover timer so an alert arriving mid-delay
      // does not immediately pop open into the usage panel; if pointer is inside, restart delay.
      if (!open) {
        collapse();
        if (pointerInside && !suppressHover.current && !dragVisual) enter();
      }
    } else if (previousId !== null) {
      if (lastAlertInUsagePanel.current) {
        lastAlertInUsagePanel.current = false;
        // A card inside the usage panel closes at once when the pointer is elsewhere.
        if (!pointerInside && !typing) collapse();
      } else {
        // ScreenHUD.closeAfterLastAlert: when the last alert leaves, collapse,
        // and a pointer still on the HUD does not reopen the usage panel
        // until it leaves.
        if (pointerInside) suppressHover.current = true;
        collapse();
        setPinned(false);
      }
    }
  }, [
    activeAlertId,
    Boolean(request),
    config.mode,
    open,
    pointerInside,
    typing,
    dragVisual,
    collapse,
    enter,
    leave,
    forceOpen,
    dragCandidate,
    suppressHover,
    setPinned,
  ]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onEscape?.();
      if (event.key === "Alt" && pointerInside && !suppressHover.current)
        enter();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [enter, pointerInside, suppressHover, onEscape]);

  function vendorUnderPointer(event: { clientX: number; clientY: number }) {
    const bounds = scene.current?.getBoundingClientRect();
    if (!bounds || config.mode === "notch") return null;
    const x = event.clientX - bounds.left - strip.x,
      y = event.clientY - bounds.top - strip.y;
    if (x < 0 || y < 0 || x > strip.width || y > strip.height) return null;
    const along = horizontal(edge) ? x : y;
    let index = -1,
      distance = Infinity;
    metrics.centers.forEach((center, candidate) => {
      if (Math.abs(center - along) < distance) {
        index = candidate;
        distance = Math.abs(center - along);
      }
    });
    return vendors[index]?.key ?? null;
  }

  /** Whether the pointer is on a pendant hung below the strip (随手记, 磁盘瘦身). */
  function onPendant(point: { clientX: number; clientY: number }) {
    return Boolean(
      document
        .elementFromPoint(point.clientX, point.clientY)
        ?.closest(".hud-app-pendant"),
    );
  }

  function followMark(event: { clientX: number; clientY: number }) {
    if (dragCandidate.current || dragPreview) return;
    const key = vendorUnderPointer(event);
    if (key && key !== hovered) {
      setHovered(key);
    }
  }

  /** `point`, when given, is where the pointer is: while an agent waits on
   * an answer, only its own mark opens the HUD (request-hover.ts). */
  function entered(
    optionDown = false,
    point?: { clientX: number; clientY: number },
  ) {
    setPointerInside(true);
    if (
      !open &&
      !hoverMayOpen({
        requestKey: request ? vendorKey(request.source) : null,
        markKeys: vendors.map((vendor) => vendor.key),
        pointerKey: point ? vendorUnderPointer(point) : undefined,
        notch: config.mode === "notch",
      })
    ) {
      // Off the waiting agent's mark: a hover that began opening stops.
      if (hoverPhase === "opening") leave();
      return;
    }
    if (
      !suppressHover.current &&
      !dragVisual &&
      (open ||
        hoverInside.current ||
        !config.requiresOptionToOpen ||
        optionDown)
    )
      enter();
  }

  function exited() {
    setPointerInside(false);
    if (!dragCandidate.current && !dragPreview) suppressHover.current = false;
    if (!typing) leave();
  }

  useEffect(() => {
    if (!nativePointer) return;
    const bounds = scene.current?.getBoundingClientRect();
    const point = nativePointer.point;
    const at = point && {
      clientX: point.x + (bounds?.left ?? 0),
      clientY: point.y + (bounds?.top ?? 0),
    };
    if (!at || !onSidebar(nativePointer.inside, onPendant(at))) {
      exited();
      return;
    }
    if (dragVisual || dragCandidate.current) return;
    followMark(at);
    entered(nativePointer.altKey === true, at);
    if (
      config.openImmediatelyAtTop &&
      edge === "top" &&
      (hoverPhase === "opening" || hoverPhase === "collapsed") &&
      point.x >= strip.x &&
      point.x <= strip.x + strip.width &&
      point.y <= 1 &&
      !suppressHover.current &&
      (!config.requiresOptionToOpen ||
        nativePointer.altKey ||
        hoverInside.current)
    )
      forceOpen();
  }, [
    nativePointer,
    dragVisual,
    config.mode,
    edge,
    hoverPhase,
    strip.x,
    strip.width,
    config.requiresOptionToOpen,
    config.openImmediatelyAtTop,
    width,
    height,
  ]);

  const domExited = (event?: { relatedTarget?: EventTarget | null }) => {
    if (nativePointer) return;
    if (
      event?.relatedTarget instanceof Element &&
      event.relatedTarget.closest(
        ".hud-resting-strip, .hud-expanded-surface, .hud-grab-surface, .hud-hover-floor",
      )
    ) {
      return;
    }
    exited();
  };

  function pin(key?: string) {
    if (
      dragCandidate.current?.armed ||
      dragPreview ||
      suppressDragClick.current
    )
      return;
    if (!clickMayPin(key, (request ?? event)?.source, config.mode)) return;
    if (key) setHovered(key);
    setExpanded(false);
    setPinned(true);
    forceOpen();
  }

  const handoff = useCallback(
    (callback?: () => void) => {
      suppressHover.current = true;
      collapse();
      callback?.();
    },
    [collapse, suppressHover],
  );
  // Settings and Statistics open before the panel goes; one that does not
  // leaves the panel up, saying why a few seconds (#220).
  const [panelFailure, setPanelFailure] = useState<string | null>(null);
  const failureTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(failureTimer.current), []);
  const openFromPanel = useCallback(
    (open: () => unknown) => {
      void openThenPutAway(open, () => handoff()).then((reason) => {
        clearTimeout(failureTimer.current);
        setPanelFailure(reason);
        if (reason !== null)
          failureTimer.current = setTimeout(
            () => setPanelFailure(null),
            RETRY_AFTER_MS,
          );
      });
    },
    [handoff],
  );
  const configurePanel = useMemo(
    () => (onConfigure ? () => openFromPanel(onConfigure) : undefined),
    [onConfigure, openFromPanel],
  );
  const showPanelStats = useMemo(
    () => (onStats ? () => openFromPanel(onStats) : undefined),
    [onStats, openFromPanel],
  );

  return {
    vendorUnderPointer,
    followMark,
    entered,
    domExited,
    pin,
    handoff,
    configurePanel,
    showPanelStats,
    openFromPanel,
    panelFailure,
  };
}
