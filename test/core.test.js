import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { calculateDirectorySize } from '../src/core.js';
import {
  mkdir,
  writeFile,
  symlink,
  rm,
} from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

async function makeTempDir() {
  const dir = await mkdtemp(join(tmpdir(), 'dsk-'));
  return dir;
}

import { mkdtemp } from 'node:fs/promises';

describe('calculateDirectorySize', () => {
  let baseDir;

  before(async () => {
    baseDir = await makeTempDir();
  });

  after(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  test('returns zero for an empty directory', async () => {
    const dir = join(baseDir, 'empty');
    await mkdir(dir);
    const size = await calculateDirectorySize(dir);
    assert.equal(size, 0);
  });

  test('sums sizes of files directly in the root', async () => {
    const dir = join(baseDir, 'flat');
    await mkdir(dir);
    await writeFile(join(dir, 'a.txt'), 'hello');   // 5 bytes
    await writeFile(join(dir, 'b.txt'), 'world!');  // 6 bytes
    const size = await calculateDirectorySize(dir);
    assert.equal(size, 11);
  });

  test('recurses into subdirectories', async () => {
    const dir = join(baseDir, 'nested');
    await mkdir(dir);
    await mkdir(join(dir, 'sub'));
    await writeFile(join(dir, 'top.txt'), 'ab');        // 2 bytes
    await writeFile(join(dir, 'sub', 'leaf.txt'), 'abcd'); // 4 bytes
    const size = await calculateDirectorySize(dir);
    assert.equal(size, 6);
  });

  test('does not follow symlinks to directories', async () => {
    const dir = join(baseDir, 'dir-symlink');
    await mkdir(dir);
    await mkdir(join(dir, 'real-sub'));
    await writeFile(join(dir, 'real-sub', 'file.txt'), '123'); // 3 bytes
    // Create a symlink to the parent — a classic cycle trap.
    await symlink(dir, join(dir, 'real-sub', 'parent-link'), 'dir');
    const size = await calculateDirectorySize(dir);
    // Without skipping symlinks, this would either hang or double-count.
    assert.equal(size, 3);
  });

  test('does not follow symlinks to files', async () => {
    const dir = join(baseDir, 'file-symlink');
    await mkdir(dir);
    await writeFile(join(dir, 'real.txt'), 'data'); // 4 bytes
    await symlink(join(dir, 'real.txt'), join(dir, 'link.txt'));
    const size = await calculateDirectorySize(dir);
    // The symlink itself contributes nothing; only the real file counts.
    assert.equal(size, 4);
  });

  test('handles deeply nested trees', async () => {
    const dir = join(baseDir, 'deep');
    let current = dir;
    for (let i = 0; i < 10; i++) {
      await mkdir(current, { recursive: true });
      await writeFile(join(current, `f${i}.txt`), 'x');
      current = join(current, `d${i}`);
    }
    await mkdir(current, { recursive: true });
    await writeFile(join(current, 'leaf.txt'), 'end');
    // 10 files of 1 byte + 1 file of 3 bytes = 13
    const size = await calculateDirectorySize(dir);
    assert.equal(size, 13);
  });

  test('throws when the root path does not exist', async () => {
    const missing = join(baseDir, 'does-not-exist');
    await assert.rejects(
      () => calculateDirectorySize(missing),
      /Cannot open directory/
    );
  });

  test('reports zero when directory contains only empty subdirectories', async () => {
    const dir = join(baseDir, 'only-empty-dirs');
    await mkdir(dir);
    await mkdir(join(dir, 'a'));
    await mkdir(join(dir, 'b'));
    await mkdir(join(dir, 'b', 'c'));
    const size = await calculateDirectorySize(dir);
    assert.equal(size, 0);
  });
});
