// pnpm run check 第一步查 src/ 下没提交的文件（L-13、L-43，积压清单组 12）。
// 样本照两次真实情形的路径：#171 的自查页 src/apps/desktop/relay-real/、#328 的预览脚手架 src/apps/desktop/preview-328/；
// 内容是合成的（真实的那两份带私人快照，留在证据目录，不进仓库）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const script = path.resolve('src/tooling/check-untracked.mjs');
const run = (root) => spawnSync(process.execPath, [script, '--root', root], { encoding: 'utf8' });

function repo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-untracked-'));
  const write = (file, text = '') => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  spawnSync('git', ['init', '-q'], { cwd: root });
  write('.gitignore', 'node_modules\ndist/\n');
  write('src/apps/desktop/src/main.tsx', 'export {};\n');
  spawnSync('git', ['add', '.'], { cwd: root });
  for (const [file, text] of Object.entries(files)) write(file, text);
  return { root, done: () => fs.rmSync(root, { recursive: true, force: true }) };
}

function assertStops(result, files) {
  assert.equal(result.status, 1, result.stdout);
  for (const file of files) assert.ok(result.stderr.includes(`  ${file}\n`), `没列出 ${file}：\n${result.stderr}`);
  assert.match(result.stderr, /场景预览台：pnpm --filter @agent-hud\/hud run scenes/);
  assert.match(result.stderr, /放 src\/ 外/);
  assert.match(result.stderr, /先 git add/);
}

test('pnpm run check 第一步就查 src/ 下没提交的文件', () => {
  const { scripts } = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.equal(scripts['check:untracked'], 'node src/tooling/check-untracked.mjs');
  assert.ok(scripts.check.startsWith('pnpm run check:untracked && '), scripts.check);
});

test('L-13：不提交的自查页 relay-real/ 留在 src/ 下，check 一开头就停，并说正确做法', () => {
  const box = repo({
    'src/apps/desktop/relay-real/main.tsx': 'import { HUDScene } from "../../../packages/hud/src/HUDScene";\n',
    'src/apps/desktop/relay-real/vite.config.ts': 'export default {}\n',
  });
  try {
    assertStops(run(box.root), ['src/apps/desktop/relay-real/main.tsx', 'src/apps/desktop/relay-real/vite.config.ts']);
  } finally {
    box.done();
  }
});

test('L-43：预览脚手架 preview-328/ 留在 src/ 下，check 一开头就停，并说正确做法', () => {
  const box = repo({
    'src/apps/desktop/preview-328/index.html': '<div id="root"></div>\n',
    'src/apps/desktop/preview-328/main.tsx': 'import { HUDScene } from "../../../packages/hud/src/HUDScene";\n',
    'src/apps/desktop/preview-328/vite.config.ts': 'export default { root: "../../../packages/hud" }\n',
  });
  try {
    assertStops(run(box.root), [
      'src/apps/desktop/preview-328/index.html',
      'src/apps/desktop/preview-328/main.tsx',
      'src/apps/desktop/preview-328/vite.config.ts',
    ]);
  } finally {
    box.done();
  }
});

test('忽略的构建产物、已 git add 的新文件、src/ 外的草稿都放行', () => {
  const box = repo({
    'src/apps/desktop/node_modules/x/index.js': '',
    'src/apps/desktop/dist/index.html': '',
    'src/packages/hud/src/new-part.tsx': 'export {};\n',
    'docs/design/三版预览.html': '',
  });
  try {
    spawnSync('git', ['add', 'src/packages/hud/src/new-part.tsx'], { cwd: box.root });
    const result = run(box.root);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    box.done();
  }
});
