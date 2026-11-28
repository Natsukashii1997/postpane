// The ChatGPT relay's own settings under its row in Agent plugins: the
// project review conversations open in, and how many reviews one leave of
// the owner's gives (#409).
import { useEffect, useState } from "react";
import { reviewLimitOptions } from "../../lib/review-limit";
import {
  Menu,
  Notice,
  Row,
  SmallButton,
  type Text,
} from "../SettingsPrimitives";
import { TextInput } from "../SettingsFields";
import {
  nativeChatGptReviewLimit,
  type ChatGptReviewLimitService,
} from "./services";
import type { ChatGpt } from "./use-status";
import { useReceipt } from "./receipt";

/** The ChatGPT project new review conversations open in: its page's address,
 * pasted and saved. */
export function ProjectRow({ chatgpt, t }: { chatgpt: ChatGpt; t: Text }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [label, showSaved] = useReceipt();
  const text = draft ?? chatgpt.project ?? "";
  const changed = text.trim() !== (chatgpt.project ?? "");
  const save = async () => {
    if (!changed || chatgpt.savingProject) return;
    if (await chatgpt.saveProject(text)) {
      setDraft(null);
      showSaved();
    }
  };
  return (
    <Row
      title={t("New reviews go into project", "新会话放进项目")}
      subtitle={t(
        "Paste a ChatGPT project page's address; review conversations PostPane opens go into it.",
        "粘贴 ChatGPT 项目页网址，驿窗新开的审核会话都放进这个项目",
      )}
      below={
        chatgpt.projectError ? (
          <Notice tone="error">{chatgpt.projectError}</Notice>
        ) : undefined
      }
    >
      <TextInput
        label={t("ChatGPT project page", "ChatGPT 项目页网址")}
        value={text}
        change={setDraft}
        placeholder="https://chatgpt.com/g/…/project"
        width={240}
        disabled={chatgpt.savingProject}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            void save();
          }
        }}
      />
      <SmallButton
        disabled={!changed || chatgpt.savingProject}
        onClick={() => void save()}
      >
        {label(t("Save", "保存"), t("Saved", "已保存"))}
      </SmallButton>
    </Row>
  );
}

/** 「审核轮数上限」: how many reviews a relay goes through before it stops
 * for the owner, 1 to 9, five unless set; the next review asked counts
 * against it (owner 2026-11-19, #409). */
export function ReviewLimitRow({
  t,
  service = nativeChatGptReviewLimit,
}: {
  t: Text;
  /** The cap's service; a fake in pictures and tests. */
  service?: ChatGptReviewLimitService;
}) {
  const [cap, setCap] = useState<{
    limit: number;
    max: number;
    default: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let dead = false;
    void service()
      .then((next) => !dead && setCap(next))
      .catch((failed) => !dead && setError(String(failed)));
    return () => {
      dead = true;
    };
  }, [service]);
  const change = async (value: string) => {
    setSaving(true);
    setError(null);
    try {
      setCap(await service(Number(value)));
    } catch (failed) {
      setError(String(failed));
    } finally {
      setSaving(false);
    }
  };
  // `t` picks a language; the menu's words follow it.
  const zh = t("en", "zh") === "zh";
  const label = t("Review rounds", "审核轮数上限");
  return (
    <Row
      title={label}
      subtitle={t(
        "A relay still asking for changes after this many reviews stops and waits for you. Takes effect from the next review.",
        "审到这么多轮还要改，接力就停下等你决定；下一次送审起生效。",
      )}
      below={error ? <Notice tone="error">{error}</Notice> : undefined}
    >
      <Menu
        label={label}
        value={cap ? String(cap.limit) : ""}
        disabled={!cap || saving}
        width={112}
        change={(value) => void change(value)}
        options={cap ? reviewLimitOptions(cap.max, cap.default, zh) : []}
      />
    </Row>
  );
}
