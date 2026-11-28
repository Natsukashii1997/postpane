import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkRules } from '../scripts/check-rules.mjs';

test('仓库符合通用规则（scripts/check-rules.mjs）', () => {
  assert.deepEqual(checkRules(process.cwd()), []);
});

test('通用规则能抓到违规样本，合规样本不误报', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-rules-'));
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  try {
    write('src/packages/a.js', 'show(item.createdAt.slice(0, 16));\nshow(beijingTime(item.createdAt));\nshow(item.updatedAt.slice(11, 16)); // 北京时间\n');
    write('src/apps/index.mjs', "server.listen(port);\nserver.listen(port, '127.0.0.1');\n");
    write('package.json', JSON.stringify({ dependencies: { 'left-pad': '1.0.0' } }, null, 2));
    assert.deepEqual(checkRules(root).map(v => `${v.file}:${v.line} ${v.kind}`), ['src/packages/a.js:1 time', 'src/apps/index.mjs:1 listen', 'package.json:3 deps']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('LESSONS 每条要有以层级词开头的「升级」行：缺行、不带层级词各报一次，合规条目和格式样例不误报', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-rules-'));
  // 真实样本：L-29、L-52 摘自本项目 2026-11-19 补层级之前的 docs/LESSONS.md（L-29 整条没有升级行，L-52 的升级行不带层级词）；
  // L-41 的缩进「  - 升级：」是补正的一部分，不能顶替顶层那一行。标题反引号里带 <…> 的真实条目本项目没有，
  // 借剪藏插件 L-02 的原标题（`<all_urls>` 曾被骨架当成格式样例的 <占位> 整条跳过），它缺层级词也要报
  const lessons = [
    '# 开发实录与坑', '', '## 怎么写', '', '```markdown', '## L-xx <一句话现象>（<YYYY-MM-DD>）', '', '- 升级：未升级。', '```', '', '---', '',
    '## L-29 内置浏览器面板隐藏时截到「卡在半路」的侧栏，误以为布局错乱（2026-11-08）', '', '- 现象：略。',
    '- 可提议提升为全局坑（和 G-11「截图要等画完」同一类：截图拍到的不一定是最终状态）。', '',
    '## L-41 bypass 模式下 Bash 仍要批准（2026-11-09）', '', '- 现象：略。', '- 升级：〔机检〕已升级（2026-11-19 补层级）。原记录：可提议提升为全局坑。',
    '- 补正（2026-11-09，agent-kit#49）：', '  - 升级：agent-kit#49（PR #50）加了 Bash 预检钩子。', '',
    '## L-52 用 Pillow 的 `ImageChops.difference(...).getbbox()` 比两张 RGBA 截图，只看透明度，小人明明在动却报「一样」（2026-11-18）', '',
    '- 现象：略。', '- 升级：已写成工具和测试（`smoke.mjs`、`tests/smoke-diff.test.mjs`）。换个项目也成立（拿 Pillow 比任何带透明的截图都会踩），可提议提升为全局坑。', '',
    '## L-60 声明了 `<all_urls>` 仍无法调用 `captureVisibleTab`（2026-11-02）', '', '- 现象：略。', '- 升级：未升级。', '',
    '## L-61 合规：未升级的也带层级词（2026-11-19）', '', '- 现象：略。', '- 升级：〔提醒〕未升级。',
    '## L-62 合规：标题反引号里带 `<文件>`、升级行带层级词（2026-11-19）', '', '- 升级：〔提醒〕部分升级（2026-11-19 补层级）：已写测试 `tests/x.test.mjs`。', '',
  ].join('\n');
  try {
    fs.mkdirSync(path.join(root, 'docs'));
    fs.writeFileSync(path.join(root, 'docs/LESSONS.md'), lessons);
    const found = checkRules(root);
    assert.deepEqual(found.map(v => `${v.file}:${v.line} ${v.kind} ${v.text}`), [
      'docs/LESSONS.md:13 lessons L-29 缺「- 升级：」一行',
      'docs/LESSONS.md:28 lessons L-52 的「升级」没以层级词开头：- 升级：已写成工具和测试（`smoke.mjs`、`tests/smoke-diff.test.mjs`）。换个项目也成立（拿 Pillow 比任何带透明的截图都会踩），可提议提升为全局坑。',
      'docs/LESSONS.md:33 lessons L-60 的「升级」没以层级词开头：- 升级：未升级。',
    ]);
    assert.match(found[0].rule, /〔提醒〕未升级/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('认网页的写法只许在插件的适配文件里：别的插件文件出现选择器各报一次，适配文件和测试不误报', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-rules-'));
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  try {
    // 真实样本：content.js 在 #548 之前自己写着按钮文字属性
    write('src/apps/chrome-extension/content.js', 'observer.observe(document, {\n  attributeFilter: ["aria-label"],\n});\nconst box = document.querySelector(".ProseMirror");\n');
    write('src/apps/chrome-extension/background.js', 'const HOME = "https://chatgpt.com/";\n');
    write('src/apps/chrome-extension/page.js', 'const SEL = { composer: \'.ProseMirror[contenteditable="true"]\' };\n');
    write('src/apps/chrome-extension/data.js', 'const API = "/backend-api/";\n');
    write('src/apps/chrome-extension/test/page.test.mjs', 'document.querySelector("[data-user-message-bubble]");\n');
    assert.deepEqual(checkRules(root).map(v => `${v.file}:${v.line} ${v.kind}`), [
      'src/apps/chrome-extension/content.js:2 page',
      'src/apps/chrome-extension/content.js:4 page',
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
