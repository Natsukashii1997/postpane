import { invoke, isTauri } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import {
  Notice,
  Page,
  Row,
  Section,
  Segments,
  ToggleRow,
  Unavailable,
  useText,
  type SettingsPaneProps,
} from "./SettingsPrimitives";
import { settingSaves } from "../lib/setting-saves";

type Failure = { key: string; message: string };

const appearanceKeys = ["appearance", "appearanceFollowsScreen", "language"];
const usageKeys = ["quotaDisplay"];
const startupKeys = ["launchAtLogin", "showMenuBarIcon"];

export function GeneralPane({ snapshot, action }: SettingsPaneProps) {
  useEffect(() => {
    if (isTauri())
      void invoke("native_system_status").catch((error) =>
        console.warn("System preferences could not be refreshed", error),
      );
  }, []);
  const t = useText(snapshot);
  const [pending, setPending] = useState(0);
  const [failure, setFailure] = useState<Failure | null>(null);
  const latest = useRef(action);
  latest.current = action;
  const [queued] = useState(() =>
    settingSaves(async (key, value) => {
      setFailure(null);
      await latest.current("set_setting", { key, value });
    }),
  );

  /** One save at a time, a click during a save waiting its turn; a failure
   * shows in the card of the setting that failed. */
  const save = async (key: string, value: unknown) => {
    setPending((count) => count + 1);
    try {
      await queued(key, value);
    } catch (error) {
      setFailure({
        key,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setPending((count) => count - 1);
    }
  };
  const setting = (key: string) => (value: unknown) => void save(key, value);
  const problem = (keys: string[]) =>
    failure && keys.includes(failure.key) ? (
      <Notice tone="error">{failure.message}</Notice>
    ) : null;

  const settings = snapshot.settings;
  const followsScreen = Boolean(settings.appearanceFollowsScreen);
  const login = snapshot.connection.system?.launchAtLogin;
  const loginReason = login?.supported
    ? undefined
    : t(
        login?.notice ?? "Not available in this build.",
        "此版本不支持登录时启动。",
      );
  // Only states the person can act on; other notices are platform plumbing.
  const loginNote = !login?.supported
    ? null
    : login.status === "requires-approval"
      ? t(
          login.notice ??
            "Allow it in System Settings → General → Login Items.",
          "需在「系统设置 → 通用 → 登录项」中允许。",
        )
      : login.status === "unavailable" && login.notice
        ? t(login.notice, "此版本找不到登录服务。")
        : null;

  const appearanceNames: Record<string, string> = {
    system: t("System", "跟随系统"),
    light: t("Light", "浅色"),
    dark: t("Dark", "深色"),
  };
  const languageNames: Record<string, string> = {
    system: t("System", "跟随系统"),
    "zh-CN": "中文",
    en: "English",
  };
  const language =
    settings.language === "zh-Hans" ? "zh-CN" : (settings.language ?? "system");
  const quotaDisplay = settings.quotaDisplay ?? "consumed";
  const launches = login?.enabled ?? settings.launchAtLogin;
  const menuBar = settings.showMenuBarIcon === true;

  const appearance = (
    <Segments
      label={t("Appearance", "外观")}
      value={settings.appearance}
      disabled={followsScreen}
      options={[
        ["system", appearanceNames.system],
        ["light", appearanceNames.light],
        ["dark", appearanceNames.dark],
      ]}
      change={setting("appearance")}
    />
  );

  const settingsIssue = snapshot.connection.settingsIssue;

  return (
    <Page>
      {settingsIssue && <Notice tone="error">{settingsIssue}</Notice>}
      <Section
        title={t("Window & language", "窗口和语言")}
        action={`${
          followsScreen
            ? t("Matches screen", "跟随所在屏幕")
            : (appearanceNames[settings.appearance] ?? settings.appearance)
        } · ${languageNames[language] ?? language}`}
      >
        <Row title={t("Appearance", "外观")}>
          {followsScreen ? (
            <Unavailable
              reason={t(
                "Turn off Match screen to choose.",
                "关闭「跟随所在屏幕」后可选。",
              )}
            >
              {appearance}
            </Unavailable>
          ) : (
            appearance
          )}
        </Row>
        <Row title={t("Language", "语言")}>
          <Segments
            label={t("Language", "语言")}
            value={language}
            options={[
              ["system", languageNames.system],
              ["zh-CN", languageNames["zh-CN"]],
              ["en", languageNames.en],
            ]}
            change={setting("language")}
          />
        </Row>
        <ToggleRow
          title={t("Match screen", "跟随所在屏幕")}
          tag={t("Experimental", "实验")}
          subtitle={t(
            "Windows take the HUD look of their screen.",
            "窗口外观跟随所在屏幕的侧栏。",
          )}
          checked={settings.appearanceFollowsScreen ?? false}
          change={setting("appearanceFollowsScreen")}
        />
        {problem(appearanceKeys)}
      </Section>
      <Section
        title={t("Quota figures", "额度数字")}
        action={
          quotaDisplay === "remaining"
            ? t("Showing remaining", "显示剩余")
            : t("Showing used", "显示已用")
        }
      >
        <Row
          title={t("Quota percentage", "额度百分比")}
          subtitle={t(
            "The panel's and the HUD's figures both follow this: 35% used is 65% remaining.",
            "面板和侧栏上的数字都按这个显示：35% 已用 = 65% 剩余。",
          )}
        >
          <Segments
            label={t("Quota percentage", "额度百分比")}
            value={quotaDisplay}
            options={[
              ["consumed", t("Used", "已用")],
              ["remaining", t("Remaining", "剩余")],
            ]}
            change={setting("quotaDisplay")}
          />
        </Row>
        {problem(usageKeys)}
      </Section>
      <Section
        title={t("Startup & menu bar", "开机和菜单栏")}
        action={
          [
            launches ? t("Launch at login", "登录时启动") : null,
            menuBar ? t("Menu bar icon", "菜单栏图标") : null,
          ]
            .filter(Boolean)
            .join(" · ") || t("Both off", "都已关闭")
        }
      >
        <ToggleRow
          title={t("Launch at login", "登录时启动")}
          checked={launches}
          disabled={pending > 0 || !login?.supported}
          reason={loginReason}
          change={setting("launchAtLogin")}
        />
        {loginNote && <Notice tone="warning">{loginNote}</Notice>}
        <ToggleRow
          title={t("Show menu bar icon", "显示菜单栏图标")}
          checked={menuBar}
          change={setting("showMenuBarIcon")}
        />
        {problem(startupKeys)}
      </Section>
    </Page>
  );
}
