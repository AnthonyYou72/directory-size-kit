import { opendir, stat } from 'node:fs/promises';

/**
 * Compute the total size, in bytes, of all regular files beneath `rootPath`.
 *
 * Design decisions (stated plainly so callers know what they are getting):
 *
 * 1. Symlinks are skipped entirely. Following them would require cycle detection and
 *    would make the result depend on link topology outside the target tree. Skipping is
 *    simpler, deterministic, and matches the common expectation that a directory's size
 *    is the size of the files actually living inside it.
 *
 * 2. Only regular files contribute. Directories, symlinks, sockets, devices, and FIFOs
 *    contribute zero. This keeps the definition of "size" unambiguous.
 *
 * 3. Errors are thrown. If a subdirectory cannot be read, the caller needs to know —
 *    returning a partial sum silently would be misleading.
 *
 * @param {string} rootPath - Absolute or relative path to the directory to measure.
 * @returns {Promise<number>} Total size in bytes of all regular files under `rootPath`.
 * @throws {Error} If `rootPath` cannot be opened or any subdirectory cannot be read.
 */
export async function calculateDirectorySize(rootPath) {
  let total = 0;
  const stack = [rootPath];

  while (stack.length > 0) {
    const currentPath = stack.pop();
    let dir;
    try {
      dir = await opendir(currentPath);
    } catch (openErr) {
      throw new Error(`Cannot open directory ${currentPath}: ${openErr.message}`);
    }

    for await (const entry of dir) {
      // Check for symlinks FIRST. A symlink pointing at an ancestor directory would
      // otherwise be recursed into, causing unbounded recursion. Evaluating
      // isSymbolicLink() before isDirectory() prevents this without any visited-set
      // bookkeeping.
      if (entry.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory()) {
        stack.push(`${currentPath}/${entry.name}`);
      } else if (entry.isFile()) {
        // Dirent does not carry file size, so we must stat the entry. Because we
        // already skipped symlinks, stat() and lstat() agree here.
        const stats = await stat(`${currentPath}/${entry.name}`);
        total += stats.size;
      }
    }
  }

  return total;
}
