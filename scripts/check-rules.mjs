// 通用规则检查：只查机器能判定的几条（AGENTS.md「规则」；全局坑 G-02；LESSONS「升级」行）。项目长出自己的硬规矩、且能机检的，照 RULES 的样子往下加。
// 只认 Node / 前端项目的写法，别的技术栈按需改。用法：node scripts/check-rules.mjs；tests/check-rules.test.mjs 也会跑。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RULES = {
  listen: '本机服务只监听 127.0.0.1（AGENTS.md 规则）',
  deps: '依赖只许 ALLOWED_DEPS 里的；要加依赖，先改 scripts/check-rules.mjs 的 ALLOWED_DEPS，并在交接里说明理由（AGENTS.md 规则）',
  time: '页面上的时间经统一的格式化函数按北京时间显示，不直接截取 ISO 字符串（全局坑 G-02）；截取的确实是北京时间字符串时，在行内注释写「北京时间」',
  page: 'ChatGPT 页面长什么样（选择器、属性名、按钮文字）只许写在插件的适配文件 page.js（画面）、data.js（对话数据）、mark.js 里，别的插件文件调用它们（#548，docs/接力规范.md 第 6 节）；页面一改只改这一处',
  shell: 'shell 脚本里变量后面紧跟中文要写成 ${变量}：macOS 自带的 bash 3.2 在 UTF-8 语言环境下会把中文字节当成变量名的一部分，set -u 下直接退出（L-82）',
  lessons: 'docs/LESSONS.md 每条坑都要有「- 升级：」一行，开头是〔结构〕〔机检〕〔体检〕〔文字〕〔提醒〕之一，后面写状态和去处，如「- 升级：〔提醒〕未升级。」「- 升级：〔机检〕已升级（2026-11-19，#405）：install.sh 的装机锁」；层级怎么选见全局 LESSONS「怎么升级」',
};
// 要扫的源码目录，按项目结构改；不存在的目录跳过
const SCAN = ['src/packages', 'src/apps', 'src/tooling'];
const EXTS = ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx'];
// 截取 *At 字段当日期时间显示，或把 ISO 的 T 换成空格：多半把 UTC 当成了北京时间
const TIME = [/\b\w*(?:At|_at)\.slice\(\s*(?:0\s*,\s*1[06]|5\s*,\s*16|11\s*,\s*16)\s*\)/, /\.replace\(\s*["']T["']\s*,\s*["'] ["']\s*\)/];
const TIME_OK = /\/[/*]\s*北京时间/;
const LISTEN_OK = /\.listen\(\s*[\w.]+\s*,\s*['"]127\.0\.0\.1['"]/;
// package.json 用白名单：黑名单认不出新出的库，白名单逼着每个新依赖都过一遍交接
// @babel/parser：卡片版式机检（src/tooling/check-card-layout.mjs）要读 TSX 的语法树；TypeScript 7 不再带可调用的解析器
const ALLOWED_DEPS = ['@babel/parser', '@playwright/test', 'prettier'];
// LESSONS「升级」行开头的层级词，口径同全局 LESSONS「怎么升级」（agent-kit hooks/lessons-remind.mjs 的 LEVELS）
const LEVELS = ['结构', '机检', '体检', '文字', '提醒'];
// 插件里认 ChatGPT 页面的写法：只许在适配文件里（#548）。网址、域名不算页面结构。
const PAGE_DIR = 'src/apps/chrome-extension';
const PAGE_OK = ['page.js', 'data.js', 'mark.js'];
// shell 脚本：$变量 后面直接跟非 ASCII 字符（L-82）
const SHELL_DIRS = ['scripts', '.agents/skills'];
const SHELL = /\$[A-Za-z_][A-Za-z0-9_]*[^\x00-\x7F]/;
const PAGE = /querySelector|\.closest\(|\.matches\(|aria-label|data-testid|data-chatgpt|data-user-message|data-turn|ProseMirror|contenteditable|backend-api/;

function files(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return ['node_modules', 'dist', 'target'].includes(entry.name) ? [] : files(file);
    return EXTS.includes(path.extname(entry.name)) ? [file] : [];
  });
}

export function checkRules(root) {
  const found = [];
  const hit = (file, line, kind, text) => found.push({ file: path.relative(root, file), line, kind, rule: RULES[kind], text: text.trim() });
  for (const file of SCAN.flatMap(dir => files(path.join(root, dir))))
    fs.readFileSync(file, 'utf8').split('\n').forEach((text, i) => {
      if (TIME.some(r => r.test(text)) && !TIME_OK.test(text)) hit(file, i + 1, 'time', text);
      if (text.includes('.listen(') && !LISTEN_OK.test(text)) hit(file, i + 1, 'listen', text);
      if (pageFile(root, file) && PAGE.test(text)) hit(file, i + 1, 'page', text);
    });
  const pkgFile = path.join(root, 'package.json');
  if (fs.existsSync(pkgFile)) {
    const text = fs.readFileSync(pkgFile, 'utf8'), pkg = JSON.parse(text), lines = text.split('\n');
    const at = key => lines.findIndex(line => line.includes(`"${key}":`)) + 1;
    for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter(n => !ALLOWED_DEPS.includes(n))) hit(pkgFile, at(name), 'deps', name);
  }
  for (const file of SHELL_DIRS.flatMap(dir => shellFiles(path.join(root, dir))))
    fs.readFileSync(file, 'utf8').split('\n').forEach((text, i) => {
      if (SHELL.test(text)) hit(file, i + 1, 'shell', text);
    });
  checkLessons(root, hit);
  return found;
}

// .sh 文件，和第一行是 bash/sh 的无扩展名脚本（scripts/hooks/pre-push）
function shellFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : shellFiles(file);
    if (entry.name.endsWith('.sh')) return [file];
    return !path.extname(entry.name) && /^#!.*\b(ba)?sh\b/.test(fs.readFileSync(file, 'utf8').split('\n', 1)[0]) ? [file] : [];
  });
}

// 插件目录下、不在测试目录里、又不是适配文件的源码
function pageFile(root, file) {
  const rel = path.relative(path.join(root, PAGE_DIR), file);
  return !rel.startsWith('..') && !rel.split(path.sep).includes('test') && !PAGE_OK.includes(rel);
}

// LESSONS 每条 L-xx 都要有以层级词开头的「升级」行；代码块里的格式样例和标题带 <占位> 的不算条目。
// 反引号里的尖括号是真实内容不是占位（剪藏插件 L-02 标题里的 `<all_urls>` 曾被当成占位整条跳过），先去掉再判断；
// 只认顶层要点，条目里缩进的「  - 升级：」是补正的一部分（L-14、L-41）
function checkLessons(root, hit) {
  const file = path.join(root, 'docs', 'LESSONS.md');
  if (!fs.existsSync(file)) return;
  let fence = false, cur = null;
  const close = () => { if (cur && !cur.up) hit(file, cur.line, 'lessons', `${cur.id} 缺「- 升级：」一行`); cur = null; };
  fs.readFileSync(file, 'utf8').split('\n').forEach((text, i) => {
    if (/^\s*```/.test(text)) { fence = !fence; return; }
    if (fence) return;
    const head = text.match(/^## (L-\d+) (.*)$/);
    if (head || text.startsWith('## ')) {
      close();
      if (head && !/<[^>]+>/.test(head[2].replace(/`[^`]*`/g, ''))) cur = { id: head[1], line: i + 1, up: false };
      return;
    }
    const up = cur && text.match(/^- 升级：(.*)$/);
    if (!up) return;
    cur.up = true;
    if (!LEVELS.some(level => up[1].startsWith(`〔${level}〕`))) hit(file, i + 1, 'lessons', `${cur.id} 的「升级」没以层级词开头：${text}`);
  });
  close();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const found = checkRules(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
  for (const v of found) console.error(`${v.file}:${v.line}  ${v.text}\n  ↳ ${v.rule}`);
  if (found.length) { console.error(`通用规则检查未通过：${found.length} 处`); process.exitCode = 1; }
  else console.log('通用规则检查通过');
}
