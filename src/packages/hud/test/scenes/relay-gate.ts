// The review gate's scenes (#409): a relay stopped at its cap, one let
// pass, and one paused short of a pass for another reason.
import type { Scene } from "./scenes.ts";
import { relay, reply, session, snapshot } from "./build.ts";

const pair = (id: string, title: string, lastAgo: number) => [
  session({
    place: "claude",
    id: `c-${id}`,
    title: `接力：${title}`,
    state: "idle",
    lastAgo,
  }),
  session({
    place: "chatgpt",
    id: `chatgpt:g-${id}`,
    title: `审核：${title}`,
    state: "idle",
    lastAgo,
  }),
];

export const relayStopped: Scene = {
  key: "relay-stopped",
  title:
    "接力审满 5 轮还要改，停了（卡上红色「停」、等你决定；点「接力」打开卡）",
  snapshot: snapshot({
    sessions: pair("stop", "接力审核门第 3 批", 2),
    handoffs: [
      relay({
        id: "h-stop",
        title: "接力审核门第 3 批",
        doer: "claude",
        session: "c-stop",
        chatgpt: "g-stop",
        phase: "returned",
        minutesAgo: 2,
        reviews: 5,
        limit: 5,
        auto: false,
        halt: "已审满 5 轮仍需修改，自动往返停下，交常浩决定",
        notice: "top",
      }),
    ],
  }),
};

export const relayPassed: Scene = {
  key: "relay-passed",
  title: "接力第 2 轮审核通过（回执里 ChatGPT 那封回信盖蓝色「过」章）",
  snapshot: snapshot({
    sessions: pair("pass", "整理导入流程", 1),
    handoffs: [
      relay({
        id: "h-pass",
        title: "整理导入流程",
        doer: "claude",
        session: "c-pass",
        chatgpt: "g-pass",
        phase: "ended",
        status: "closed",
        minutesAgo: 1,
        reviews: 2,
        limit: 5,
        verdict: "pass",
        notice: "passed",
      }),
    ],
    events: [reply("chatgpt", "chatgpt:g-pass", 1, "审核：整理导入流程")],
  }),
};

export const relayPaused: Scene = {
  key: "relay-paused",
  title: "接力回信末尾认不出，自动往返停下（「接力」旁写「未完暂停」）",
  snapshot: snapshot({
    sessions: pair("pause", "重写缓存层", 3),
    handoffs: [
      relay({
        id: "h-pause",
        title: "重写缓存层",
        doer: "claude",
        session: "c-pause",
        chatgpt: "g-pause",
        phase: "replied",
        minutesAgo: 3,
        reviews: 2,
        limit: 5,
        auto: false,
        halt: "回信末尾两行认不出，自动往返停下，交常浩决定",
      }),
    ],
  }),
};

// Stopped at its cap, then put away by PostPane after a day idle; its Claude
// session is no longer listed (#411 L2 P2-02, P2-04).
const idled = relay({
  id: "h-idle",
  title: "整理部署脚本",
  doer: "claude",
  session: "c-gone",
  chatgpt: "g-idle",
  phase: "returned",
  minutesAgo: 25 * 60,
  reviews: 5,
  limit: 5,
  auto: false,
  halt: "已审满 5 轮仍需修改，自动往返停下，交常浩决定",
  notice: "top",
});
export const relayIdleStopped: Scene = {
  key: "relay-idle-stopped",
  title:
    "停了一天没人管，驿窗自动收起但还没了结（「停」还在；原会话已不在，按钮置灰）",
  snapshot: snapshot({
    sessions: [pair("idle", "整理部署脚本", 60)[1]],
    handoffs: [
      {
        ...idled,
        status: "closed",
        phase: "ended",
        steps: [
          ...(idled.steps ?? []),
          {
            at: idled.updatedAt + 24 * 3_600_000 + 60_000,
            kind: "end",
            auto: true,
            text: "闲置一天，驿窗自动结束",
          },
        ],
        updatedAt: idled.updatedAt + 24 * 3_600_000 + 60_000,
      },
    ],
  }),
};
