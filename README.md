# directory-size-kit

Walks a directory tree summing the sizes of all regular files, skipping symlinks entirely so the result is deterministic and always terminates.

```js
import { calculateDirectorySize } from 'directory-size-kit';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Create a real directory with some real files, then measure it.
const totalBytes = await calculateDirectorySize(
  await mkdtemp(join(tmpdir(), 'dsk-'))
);
// Throws if the directory does not exist. Returns the sum of all
// regular file sizes beneath the given path, in bytes.
```

## Why this exists

Getting the total size of a directory sounds trivial until a symlink creates a cycle — follow it naively and the walk never finishes. This library makes a single, deliberate choice to sidestep that problem: **symlinks are never followed**. Not to files, not to directories, not for `stat` calls. The reported size is the sum of the regular files that physically live under the path you gave it.

The trade-off is that a symlinked-in dependency or external file does not contribute to the total. If you need the "logical" size — what the tree would be if you dereferenced every link — you need a different tool.

## The edge you will hit

A symlink pointing at an ancestor directory (common in node_modules or build output that links back to the project root) is the exact case that breaks a naive recursive walker. Because `dirent.isSymbolicLink()` is checked before any recursion decision is made, such links are skipped and the walk completes in finite time.
