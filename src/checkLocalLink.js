// Checks a link to another place in the same repo, like docs/setup.md or
// CONTRIBUTING.md#running-tests: does the file exist, and does the heading?
import { existsSync, realpathSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { findAnchors } from './markdownAnchors.js';

export async function checkLocalLink(repoPath, fromFile, target, anchorCache) {
  // Absolute, so the "is it inside the repo" checks work however repoPath was written.
  const root = resolve(repoPath);
  const hashIndex = target.indexOf('#');
  const pathPart = hashIndex === -1 ? target : target.slice(0, hashIndex);
  const anchor = hashIndex === -1 ? '' : decode(target.slice(hashIndex + 1));

  // A bare "#usage" points at a heading in the same file.
  const fromPath = join(root, fromFile);
  const linkedPath = pathPart === '' ? fromPath : resolve(dirname(fromPath), decode(pathPart.split('?')[0]));

  if (!isInside(root, linkedPath)) {
    return { ok: false, reason: 'points outside the repo' };
  }
  if (!existsSync(linkedPath)) {
    return { ok: false, reason: 'file not found' };
  }
  // A symlink's own name can be inside the repo while it points somewhere
  // else on the machine, and vet must never read files outside the clone.
  if (!isInside(realpathSync(root), realpathSync(linkedPath))) {
    return { ok: false, reason: 'points outside the repo' };
  }

  // Only Markdown headings can be checked; #L10 line links are GitHub's own.
  const anchorIsCheckable = anchor !== '' && linkedPath.endsWith('.md') && !/^L\d+/.test(anchor);
  if (!anchorIsCheckable || statSync(linkedPath).isDirectory()) {
    return { ok: true };
  }

  const anchors = await anchorsFor(linkedPath, anchorCache);
  if (anchors.has(anchor.toLowerCase())) {
    return { ok: true };
  }
  return { ok: false, reason: `no heading #${anchor}` };
}

function isInside(folder, path) {
  return path === folder || path.startsWith(folder + sep);
}

async function anchorsFor(path, anchorCache) {
  if (!anchorCache.has(path)) {
    anchorCache.set(path, findAnchors(await readFile(path, 'utf8')));
  }
  return anchorCache.get(path);
}

// "my%20file.md" -> "my file.md", leaving malformed escapes as they are.
function decode(text) {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}
