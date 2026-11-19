// 随手记换版检查（#419）：在替身页面里跑驿窗注入的那一段，看什么时候重载、什么时候不动。
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const SCRIPT = readFileSync(
  new URL("./float_notes_refresh.js", import.meta.url),
  "utf8",
);
const ORIGIN = "http://127.0.0.1:5178";
const OLD = ["/assets/index-Old111.js", "/assets/index-OldCss.css"];

/** 数码世界首页：Vite 打出来的样子，入口一个 JS、一个 CSS。 */
const home = ([js, css]) => `<!doctype html><html><head>
<link rel="icon" type="image/png" href="/assets/digivice-192.png" />
<link rel="manifest" href="/assets/manifest.webmanifest" />
<script type="module" crossorigin src="${js}"></script>
<link rel="stylesheet" crossorigin href="${css}">
</head><body><div id="root"></div></body></html>`;

/**
 * 一个替身页面：`running` 是当前页面里的入口文件，`served` 是服务现在的首页（字符串），
 * 或者一个函数（自定义 fetch 结果）。`editing` 为真时页面里有一张便签在编辑。
 */
function page({
  running = OLD,
  served = home(OLD),
  editing = false,
  host = { prepareCollapse: async () => ({ ok: true }) },
} = {}) {
  const calls = { fetch: [], reload: 0, prepare: 0 };
  const elements = [
    { src: "/assets/digivice-192.png", attr: "href" },
    { src: running[0], attr: "src" },
    { src: running[1], attr: "href" },
    // 运行中页面自己插进来的东西，不该被当成换版。
    { src: "/assets/lazy-Chunk9.css", attr: "href" },
  ].map(({ src, attr }) => ({
    getAttribute: (name) => (name === attr ? src : null),
  }));
  const document = {
    querySelector(selector) {
      assert.match(selector, /is-edit|contenteditable/);
      return editing ? {} : null;
    },
    querySelectorAll(selector) {
      assert.equal(selector, "script[src], link[href]");
      return elements;
    },
  };
  const window = {
    floatingNotesHost: host && {
      ...host,
      prepareCollapse: host.prepareCollapse
        ? (...args) => {
            calls.prepare += 1;
            return host.prepareCollapse(...args);
          }
        : undefined,
    },
  };
  const context = vm.createContext({
    window,
    document,
    URL,
    location: {
      href: `${ORIGIN}/?floatingNotes=1#/float`,
      reload: () => {
        calls.reload += 1;
      },
    },
    fetch: async (url, options) => {
      calls.fetch.push([url, options]);
      if (typeof served === "function") return served();
      return { ok: true, text: async () => served };
    },
  });
  return { context, calls };
}

const run = ({ context }) => vm.runInContext(SCRIPT, context);

test("没换版：打开随手记不重载", async () => {
  const notes = page();
  assert.equal(await run(notes), "current");
  assert.equal(notes.calls.reload, 0);
  assert.equal(notes.calls.prepare, 0);
});

test("每次都向服务要最新首页，不用缓存", async () => {
  const notes = page();
  await run(notes);
  // 选项对象出自页面那一边（另一个 realm），按内容比。
  assert.equal(JSON.stringify(notes.calls.fetch), '[["/",{"cache":"no-store"}]]');
});

test("只换了 CSS（只改样式的发版）：先把草稿落本机，再重载", async () => {
  const notes = page({ served: home([OLD[0], "/assets/index-NewCss.css"]) });
  assert.equal(await run(notes), "reloaded");
  assert.equal(notes.calls.prepare, 1);
  assert.equal(notes.calls.reload, 1);
});

test("换了 JS：重载", async () => {
  const notes = page({ served: home(["/assets/index-New222.js", OLD[1]]) });
  assert.equal(await run(notes), "reloaded");
  assert.equal(notes.calls.reload, 1);
});

test("页面里写的是完整地址也认得出没换版", async () => {
  const notes = page({ running: OLD.map((path) => ORIGIN + path) });
  assert.equal(await run(notes), "current");
});

test("有便签正在编辑：这次不重载，也不去碰草稿", async () => {
  const notes = page({ served: home(["/assets/index-New222.js", OLD[1]]), editing: true });
  assert.equal(await run(notes), "editing");
  assert.equal(notes.calls.prepare, 0);
  assert.equal(notes.calls.reload, 0);
});

test("草稿落不下来（输入法拼字中、写入失败）：不重载", async () => {
  const notes = page({
    served: home(["/assets/index-New222.js", OLD[1]]),
    host: { prepareCollapse: async () => ({ ok: false, reason: "composition" }) },
  });
  assert.equal(await run(notes), "busy");
  assert.equal(notes.calls.reload, 0);
});

test("落草稿时出错：不重载", async () => {
  const notes = page({
    served: home(["/assets/index-New222.js", OLD[1]]),
    host: {
      prepareCollapse: async () => {
        throw new Error("storage");
      },
    },
  });
  assert.equal(await run(notes), "busy");
  assert.equal(notes.calls.reload, 0);
});

test("页面没提供收尾接口（旧版数码世界）：直接重载", async () => {
  const notes = page({ served: home(["/assets/index-New222.js", OLD[1]]), host: null });
  assert.equal(await run(notes), "reloaded");
  assert.equal(notes.calls.reload, 1);
});

test("取不到首页：不重载", async () => {
  for (const served of [
    () => Promise.reject(new TypeError("Load failed")),
    () => ({ ok: false, text: async () => "" }),
  ]) {
    const notes = page({ served });
    assert.equal(await run(notes), "unreachable");
    assert.equal(notes.calls.reload, 0);
  }
});

test("首页里看不出版本：不重载", async () => {
  const notes = page({ served: "<!doctype html><title>维护中</title>" });
  assert.equal(await run(notes), "unknown");
  assert.equal(notes.calls.reload, 0);
});
