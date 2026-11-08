import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkFileSizes, ownLines } from '../src/tooling/check-file-size.mjs';

const script = path.resolve('src/tooling/check-file-size.mjs');
const lines = (n) => 'x\n'.repeat(n);

function sandbox(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-file-size-'));
  fs.mkdirSync(path.join(root, 'src/tooling'), { recursive: true });
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  for (const [file, text] of Object.entries(files)) write(file, text);
  return { root, write, done: () => fs.rmSync(root, { recursive: true, force: true }) };
}

const run = (root, ...args) => spawnSync(process.execPath, [script, '--root', root, ...args], { encoding: 'utf8' });

test('仓库当前没有超出棘轮的源文件', () => {
  assert.deepEqual(checkFileSizes(process.cwd()).errors, []);
});

test('Rust 自带测试模块、测试文件和 fixtures 不计入', () => {
  assert.equal(ownLines(`${lines(10)}#[cfg(test)]\nmod tests {\n${lines(500)}}\n`, true), 10);
  assert.equal(ownLines(lines(12), false), 12);
  const box = sandbox({
    'src/crates/a/src/tests.rs': lines(400),
    'src/crates/a/src/tests/big.rs': lines(400),
    'src/packages/a/test/big.test.ts': lines(400),
    'src/packages/a/src/big.test.ts': lines(400),
    'src/fixtures/big.mjs': lines(400),
    'src/packages/a/src/types.d.ts': lines(400),
  });
  try {
    assert.deepEqual(checkFileSizes(box.root).sizes, {});
  } finally {
    box.done();
  }
});

test('--update 写基线；基线里的文件变长就失败，变短通过并提示更新', () => {
  const box = sandbox({ 'src/crates/a/src/big.rs': lines(400), 'src/packages/a/src/small.ts': lines(300) });
  try {
    const update = run(box.root, '--update');
    assert.equal(update.status, 0, update.stderr);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(box.root, 'src/tooling/file-size-baseline.json'), 'utf8')), {
      'src/crates/a/src/big.rs': 400,
    });
    assert.equal(run(box.root).status, 0);

    box.write('src/crates/a/src/big.rs', lines(401));
    const grown = run(box.root);
    assert.equal(grown.status, 1);
    assert.match(grown.stderr, /src\/crates\/a\/src\/big\.rs 有 401 行，比基线 400 行长了/);

    box.write('src/crates/a/src/big.rs', lines(350));
    const shrunk = run(box.root);
    assert.equal(shrunk.status, 0, shrunk.stderr);
    assert.match(shrunk.stdout, /比基线短了：跑 node src\/tooling\/check-file-size\.mjs --update/);
  } finally {
    box.done();
  }
});

test('新文件超过 300 行失败；进了允许名单且有理由就放行，超过名单上限仍失败', () => {
  const box = sandbox({ 'src/tooling/file-size-baseline.json': '{}\n', 'src/packages/a/src/new.tsx': lines(301) });
  try {
    const fresh = run(box.root);
    assert.equal(fresh.status, 1);
    assert.match(fresh.stderr, /src\/packages\/a\/src\/new\.tsx 有 301 行，超过 300 行/);

    const allow = (entry) =>
      box.write('src/tooling/file-size-allowlist.json', JSON.stringify({ 'src/packages/a/src/new.tsx': entry }));
    allow({ max: 320, reason: '一张数据表，拆开反而难对照' });
    assert.equal(run(box.root).status, 0);

    allow({ max: 320, reason: '' });
    assert.match(run(box.root).stderr, /要写成 \{ "max"/, '没写理由不放行');

    allow({ max: 320, reason: '一张数据表，拆开反而难对照' });
    box.write('src/packages/a/src/new.tsx', lines(321));
    const over = run(box.root);
    assert.equal(over.status, 1);
    assert.match(over.stderr, /超过允许名单的上限 320/);

    run(box.root, '--update');
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(box.root, 'src/tooling/file-size-baseline.json'), 'utf8')),
      {},
      '名单里的文件不进基线',
    );
  } finally {
    box.done();
  }
});
