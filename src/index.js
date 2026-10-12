/**
 * directory-size-kit — a focused library for calculating the total size of a directory tree.
 *
 * Walks a directory recursively, summing the sizes of regular files. Symlinks are NEVER
 * followed, which guarantees termination without requiring any cycle tracking and makes
 * the reported size a property of the directory itself, not of whatever happens to be
 * linked into it.
 *
 * `dirent.isSymbolicLink()` is evaluated BEFORE the recursive call decides what to do,
 * so a symlink that points at its own parent directory cannot trigger infinite recursion.
 */

export { calculateDirectorySize } from './core.js';
