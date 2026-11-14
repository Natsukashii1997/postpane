import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ArrowUpRight, CircleArrowDown, Settings } from "lucide-react";
import { motion, MotionConfig } from "motion/react";
import type { Quota, Snapshot } from "@agent-hud/protocol";
import { Button } from "@agent-hud/ui/components/button";
import {
  defaultHUDConfig,
  vendorKey,
  type HUDConfig,
  type HUDUpdateNotice,
} from "./model";
import { usePanelServices } from "./PanelContext";
import { FittingName } from "./panel/FittingName";
import { useBoardBlocks } from "./panel/board-blocks";
import { SourceSessions } from "./panel/SourceSessions";
import {
  densityMetrics,
  inPanelOrder,
  receiptTear,
  usePanelPalette,
  type Logo,
} from "./panel/theme";
import { OpenNotice } from "./OpenNotice";
import { usePaper } from "./paper";
import { SourceTokenChart } from "./panel/TokenChartSection";
import { SourceIndexing } from "./panel/IndexingSection";
import { blockListed, panelHidesTokens } from "./panel/agent-board";
import { agentVendorName } from "./agent-artwork";
import { missingReadingNotice } from "./panel/account-labels";
import { snapshotLanguage } from "@agent-hud/ui/format";

export { SOURCE_PANEL } from "./panel/theme";

export interface SourceHoverPanelProps {
  config?: HUDConfig;
  snapshot: Snapshot;
  focusVendor?: string;
  /** The agent (mark key) the board scrolls to and briefly frames: the one a
   * peek grew from, or the mark the pointer moved to since. */
  spotlight?: string;
  light: boolean;
  Logo: Logo;
  onConfigure?: () => void;
  onStats?: () => void;
  /** Why Settings or Statistics did not open just now (#220); empty when
   * it gave no reason. */
  openFailure?: string | null;
  /** The product's newer version, as Open's HUD showed it: an arrow beside
   * Statistics that opens the update in Settings. */
  update?: HUDUpdateNotice | null;
  onUpdate?: () => void;
  maxHeight?: number;
  active?: boolean;
  inlineAlert?: ReactNode;
}

/** Default HoverPanelView arrangement. Missing account plans and per-cycle measures remain unknown. */
export const SourceHoverPanel = memo(function SourceHoverPanel({
  config = defaultHUDConfig,
  snapshot,
  focusVendor,
  spotlight,
  light,
  Logo,
  onConfigure,
  onStats,
  openFailure = null,
  update,
  onUpdate,
  maxHeight,
  active = true,
  inlineAlert,
}: SourceHoverPanelProps) {
  const colors = usePanelPalette(light);
  const paper = usePaper();
  const services = usePanelServices();
  const [draftError, setDraftError] = useState<string | null>(null);
  const panelElement = useRef<HTMLDivElement>(null),
    [contentWidth, setContentWidth] = useState<number>();
  const scroller = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState<string | null>(null);
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
      box.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    };
    reach();
    // A board just grown from a peek gets its height capped a frame later;
    // only then can it scroll, so it reaches again as its size settles.
    const sized = new ResizeObserver(reach);
    sized.observe(box);
    setLit(block.dataset.hudBlock ?? null);
    const timer = setTimeout(() => {
      sized.disconnect();
      setLit(null);
    }, 1200);
    return () => {
      sized.disconnect();
      clearTimeout(timer);
    };
  }, [spotlight]);
  useEffect(() => {
    const element = panelElement.current;
    if (!element) return;
    const measure = () => setContentWidth(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const rows = useMemo(
    () =>
      snapshot.quotas.filter(
        (row) =>
          !focusVendor || vendorKey(row.vendor) === vendorKey(focusVendor),
      ),
    [snapshot.quotas, focusVendor],
  );
  const rowsByVendor = useMemo(() => {
    const groups = new Map<string, Quota[]>();
    for (const row of rows) {
      const group = groups.get(row.vendor) ?? [];
      group.push(row);
      groups.set(row.vendor, group);
    }
    return groups;
  }, [rows]);
  const vendorNames = useMemo(
    () =>
      [
        ...new Set([
          ...rows.map((row) => row.vendor),
          ...snapshot.providers
            .filter(
              (provider) =>
                provider.detected &&
                provider.enabled &&
                (!focusVendor ||
                  vendorKey(provider.id) === vendorKey(focusVendor)) &&
                !snapshot.billing.some(
                  (account) =>
                    vendorKey(account.vendor) === vendorKey(provider.id),
                ),
            )
            .map((provider) => provider.id),
        ]),
      ].filter(
        (vendor) =>
          !config.panelLayout.blocks?.[vendor]?.hidden &&
          blockListed(
            snapshot.quotas,
            vendor,
            config.panelLayout.blocks?.[vendor]?.widget,
            missingReadingNotice(snapshot.providers, vendor),
          ),
      ),
    [
      rows,
      snapshot.providers,
      snapshot.billing,
      focusVendor,
      config.panelLayout,
    ],
  );
  const billing = snapshot.billing.filter(
    (account) =>
      !focusVendor || vendorKey(account.vendor) === vendorKey(focusVendor),
  );
  const density = densityMetrics[config.layoutDensity] ?? densityMetrics.normal;
  const { blocks, split, waiting } = useBoardBlocks({
    config,
    snapshot,
    focusVendor,
    vendorNames,
    rowsByVendor,
    billing,
    active,
    light,
    Logo,
    onStats,
  });
  const blockLines: (typeof blocks)[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i],
      next = blocks[i + 1];
    if (
      (contentWidth ?? config.panelWidth - 40) - density.section >= 460 &&
      next &&
      config.panelLayout.blocks?.[block.key]?.span === "half" &&
      config.panelLayout.blocks?.[next.key]?.span === "half"
    ) {
      blockLines.push([block, next]);
      i++;
    } else blockLines.push([block]);
  }
  const customTokens = Object.keys(config.panelLayout.tokens ?? {}).length > 0;
  // A panel on an agent with no quota shows no day's tokens (owner, 2026-11-06).
  const tokensAbove =
    Boolean(focusVendor) &&
    ((config.quotaDetails &&
      vendorNames.length > 0 &&
      vendorNames.every((vendor) =>
        panelHidesTokens(
          snapshot.quotas,
          vendor,
          config.panelLayout.blocks?.[vendor]?.widget,
        ),
      )) ||
      // An agent with no block at all (ChatGPT's web channel) has no tokens
      // to show either (#145).
      (!vendorNames.length &&
        !snapshot.quotas.some(
          (row) => vendorKey(row.vendor) === vendorKey(focusVendor ?? ""),
        )));
  const sections = inPanelOrder<{ key: string; content: ReactNode }>(
    [
      {
        key: "blocks",
        content: config.quotaDetails && blocks.length > 0 && (
          <div
            className="hud-source-blocks"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--hud-section-gap)",
            }}
          >
            {blockLines.map((line, index) => (
              <div
                key={line.map((b) => b.key).join("+")}
                style={{
                  display: "grid",
                  gridTemplateColumns: line.length === 2 ? "1fr 1fr" : "1fr",
                  gap: density.section,
                  ...(index > 0 &&
                  config.panelLayout.style?.separators !== false
                    ? {
                        ...(paper
                          ? receiptTear(paper)
                          : { boxShadow: `inset 0 1px 0 ${colors.divider}` }),
                        paddingTop: "var(--hud-divided-gap)",
                      }
                    : {}),
                }}
              >
                {line.map((block) => (
                  <div
                    key={block.key}
                    data-hud-block={block.key}
                    data-hud-half={line.length === 2 ? "true" : undefined}
                    style={{
                      minWidth: 0,
                      borderRadius: 4,
                      // The amber of a warning reading; deeper on light paper.
                      boxShadow: `inset 0 0 0 1.5px ${
                        light ? "rgba(184,128,0," : "rgba(255,210,63,"
                      }${lit === block.key ? 0.7 : 0})`,
                      transition: "box-shadow 0.45s ease-out",
                    }}
                  >
                    {block.content}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ),
      },
      {
        key: "tokens",
        // The day's tokens now sit in the sessions' folded line, or under an
        // agent with no quota (owner, 2026-11-05); the chart with its periods
        // stays for a layout that sets the chart up itself.
        content: config.tokenUsage && customTokens && (
          <SourceTokenChart
            snapshot={snapshot}
            focusVendor={focusVendor}
            light={light}
            Logo={Logo}
            layout={config.panelLayout.tokens}
            active={active}
          />
        ),
      },
      {
        key: "sessions",
        content: config.sessionList && (
          <SourceSessions
            snapshot={snapshot}
            focusVendor={focusVendor}
            light={light}
            Logo={Logo}
            onStats={onStats}
            layout={config.panelLayout.sessions}
            tokenAgents={config.panelLayout.tokens?.agents}
            showTokens={config.tokenUsage && !tokensAbove}
            active={active}
            split={split}
          />
        ),
      },
    ],
    config.panelSections ?? defaultHUDConfig.panelSections,
  );
  const panel = (
    <div
      ref={panelElement}
      className="hud-source-hover-panel"
      data-density={config.layoutDensity}
      style={
        {
          "--hud-section-gap": `${density.section}px`,
          "--hud-block-gap": `${density.block}px`,
          "--hud-row-padding": `${density.row}px`,
          "--hud-session-gap": `${density.session}px`,
          "--hud-divided-gap": `${density.divided}px`,
          display: "flex",
          flexDirection: "column",
          gap: density.section,
          maxHeight,
          color: colors.text,
        } as CSSProperties
      }
    >
      <div
        ref={scroller}
        data-hud-natural-scroll
        style={{
          overflowY: "auto",
          // The agents' headings run out to the paper's edges, past this box;
          // without this a sideways swipe on a row scrolls the whole panel.
          overflowX: "hidden",
          minHeight: 0,
          flex: "1 1 auto",
        }}
      >
        <div
          className="hud-source-sections"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: density.section,
          }}
        >
          {inlineAlert && (
            <div
              data-hud-section="inline-alert"
              style={
                config.panelLayout.style?.separators !== false
                  ? {
                      boxShadow: `inset 0 -1px 0 ${colors.divider}`,
                      paddingBottom: "var(--hud-divided-gap)",
                    }
                  : undefined
              }
            >
              {inlineAlert}
            </div>
          )}
          {snapshot.indexing?.kind && (
            <div
              data-hud-section="indexing"
              style={
                config.panelLayout.style?.separators !== false
                  ? {
                      boxShadow: `inset 0 -1px 0 ${colors.divider}`,
                      paddingBottom: "var(--hud-divided-gap)",
                    }
                  : undefined
              }
            >
              <SourceIndexing snapshot={snapshot} light={light} />
            </div>
          )}
          {waiting}
          {focusVendor && !vendorNames.length && (
            <strong style={{ fontSize: 13, fontWeight: 600 }}>
              {agentVendorName(focusVendor)}
            </strong>
          )}
          {sections.map((section) =>
            section.content ? (
              <div key={section.key} data-hud-section={section.key}>
                {section.content}
              </div>
            ) : null,
          )}
        </div>
      </div>
      {services?.draft?.unsaved && (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontSize: 11,
            color: colors.secondary,
          }}
        >
          <div style={{ flex: 1, display: "grid", gap: 1, minWidth: 0 }}>
            <strong style={{ fontWeight: 600, color: colors.text }}>
              {draftTitle(services.draft!, snapshotLanguage(snapshot))}
            </strong>
            <FittingName
              {...draftNote(services.draft!, snapshotLanguage(snapshot))}
              style={{ fontSize: 10, color: colors.secondary }}
            />
          </div>
          {draftError && <span role="alert">{draftError}</span>}
          <Button
            size="xs"
            variant="ghost"
            onClick={() =>
              void services
                .draft!.discard()
                .catch((error) => setDraftError(String(error)))
            }
          >
            {snapshotLanguage(snapshot) === "zh" ? "丢弃" : "Discard"}
          </Button>
          <Button
            size="xs"
            onClick={() =>
              void services
                .draft!.save()
                .catch((error) => setDraftError(String(error)))
            }
          >
            {snapshotLanguage(snapshot) === "zh" ? "保存" : "Save"}
          </Button>
        </div>
      )}
      {services?.draft?.heldUntil && (
        <Button size="xs" variant="ghost" onClick={services.draft.release}>
          {snapshotLanguage(snapshot) === "zh" ? "完成编辑" : "Finish editing"}
        </Button>
      )}
      {openFailure !== null && (
        <OpenNotice
          text={
            openFailure ||
            (snapshotLanguage(snapshot) === "zh" ? "没能打开" : "Couldn't open")
          }
          light={light}
        />
      )}
      <footer
        data-hud-footer
        className="hud-source-footer"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flex: "0 0 auto",
          paddingTop: 6,
          ...(paper
            ? receiptTear(paper)
            : { boxShadow: `inset 0 1px 0 ${colors.divider}` }),
          color: colors.secondary,
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          aria-label={snapshotLanguage(snapshot) === "zh" ? "设置" : "Settings"}
          title={snapshotLanguage(snapshot) === "zh" ? "设置" : "Settings"}
          disabled={!onConfigure}
          onClick={onConfigure}
          style={footerLink(colors.secondary)}
        >
          <Settings style={{ width: 13, height: 13 }} strokeWidth={1.7} />
          {snapshotLanguage(snapshot) === "zh" ? "设置" : "Settings"}
        </Button>
        <div style={{ display: "flex", alignItems: "center" }}>
          {update && (
            // It arrives as the HUD's other changes do: it grows in, or with
            // reduced motion only fades in.
            <motion.span
              key={update.version}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{ display: "inline-flex" }}
            >
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={
                  snapshotLanguage(snapshot) === "zh"
                    ? "发现新版本"
                    : "New version available"
                }
                title={
                  snapshotLanguage(snapshot) === "zh"
                    ? `更新至 ${update.version}`
                    : `Update to ${update.version}`
                }
                disabled={!onUpdate}
                onClick={onUpdate}
                style={{
                  width: 28,
                  height: 28,
                  minHeight: 28,
                  padding: 0,
                  borderRadius: 0,
                  color: colors.accent,
                  background: "transparent",
                }}
              >
                <CircleArrowDown
                  style={{ width: 14, height: 14 }}
                  strokeWidth={1.7}
                />
              </Button>
            </motion.span>
          )}
          <Button
            variant="ghost"
            size="sm"
            aria-label={
              snapshotLanguage(snapshot) === "zh"
                ? "用量统计"
                : "Usage statistics"
            }
            title={
              snapshotLanguage(snapshot) === "zh"
                ? "用量统计"
                : "Usage statistics"
            }
            disabled={!onStats}
            onClick={onStats}
            style={footerLink(colors.secondary)}
          >
            {snapshotLanguage(snapshot) === "zh" ? "统计" : "Statistics"}
            <ArrowUpRight style={{ width: 13, height: 13 }} strokeWidth={1.7} />
          </Button>
        </div>
      </footer>
    </div>
  );
  // The panel's charts move as the HUD does: not at all when animations are
  // off (the setting, a picture) or the system asks for reduced motion.
  return (
    <MotionConfig
      reducedMotion={
        config.animations && snapshot.settings.animations ? "user" : "always"
      }
    >
      {panel}
    </MotionConfig>
  );
});

/** The footer's two links: settings, and the Statistics window. */
function footerLink(color: string): CSSProperties {
  return {
    height: 28,
    minHeight: 28,
    gap: 5,
    padding: "0 4px",
    borderRadius: 0,
    fontSize: 12,
    fontWeight: 400,
    color,
    background: "transparent",
  };
}

type DraftState = NonNullable<
  NonNullable<ReturnType<typeof usePanelServices>>["draft"]
>;

/** What waits (Open's PanelDraftBar.title): a layout, with or without a
 * style, a style alone, or the app's settings alone. */
function draftTitle(draft: DraftState, language: "en" | "zh") {
  const zh = language === "zh";
  if (draft.layout) return zh ? "布局未保存" : "Unsaved layout";
  if (draft.style) return zh ? "HUD 样式未保存" : "Unsaved HUD style";
  return zh ? "应用设置未保存" : "Unsaved app settings";
}

/** When the draft goes, and whose it is (Open's PanelDraftBar.note): this
 * display's alone, or with the app's settings, which are every display's;
 * `short` where `name` does not fit. */
function draftNote(draft: DraftState, language: "en" | "zh") {
  const zh = language === "zh";
  const restart = zh ? "重启后丢弃" : "Dropped on restart";
  if (draft.app) {
    if (!draft.layout && !draft.style) return { name: restart, short: restart };
    return zh
      ? { name: "含应用设置，重启后丢弃", short: "含应用设置" }
      : {
          name: "With app settings, dropped on restart",
          short: "With app settings",
        };
  }
  if (draft.layout === "shared") return { name: restart, short: restart };
  return zh
    ? { name: "仅此显示器，重启后丢弃", short: "仅此显示器" }
    : {
        name: "This display only, dropped on restart",
        short: "This display only",
      };
}
