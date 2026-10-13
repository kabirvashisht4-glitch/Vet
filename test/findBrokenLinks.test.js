// Checks links that point inside the repo: missing files, missing headings,
// folders, and links that escape the repo. Uses no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { symlink } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { findBrokenLinks } from '../src/findBrokenLinks.js';
import { createFixtureRepo, removeFixtureRepo } from './fixtureRepo.js';

test('reports broken local links with file, line and reason', async () => {
  const repoPath = await createFixtureRepo({
    'README.md': [
      '# Project',
      '[guide](docs/guide.md) [setup section](docs/guide.md#setup) [src folder](src/)',
      '[missing file](docs/missing.md)',
      '[missing heading](docs/guide.md#deploy)',
      '[back to top](#project) [no such heading](#nowhere)',
      '[escape](../../etc/passwd) [encoded](docs/my%20notes.md) [line link](docs/guide.md#L3)',
    ].join('\n'),
    'docs/guide.md': '# Guide\n\n## Setup\n',
    'docs/my notes.md': 'notes',
    'src/index.js': '',
  });

  try {
    const result = await findBrokenLinks(repoPath);
    const broken = result.brokenLinks.map((link) => `${link.url} | ${link.file}:${link.line} | ${link.reason}`);

    assert.deepEqual(broken, [
      'docs/missing.md | README.md:3 | file not found',
      'docs/guide.md#deploy | README.md:4 | no heading #deploy',
      '#nowhere | README.md:5 | no heading #nowhere',
      '../../etc/passwd | README.md:6 | points outside the repo',
    ]);
    assert.equal(result.checkedCount, 10);
  } finally {
    await removeFixtureRepo(repoPath);
  }
});

test('gives the same answer when the repo path is relative', async () => {
  const repoPath = await createFixtureRepo({
    'README.md': '[guide](docs/guide.md#setup) [missing](docs/missing.md)',
    'docs/guide.md': '# Guide\n\n## Setup\n',
  });

  try {
    const relativePath = relative(process.cwd(), repoPath);
    const result = await findBrokenLinks(relativePath);
    assert.deepEqual(
      result.brokenLinks.map((link) => `${link.url}: ${link.reason}`),
      ['docs/missing.md: file not found'],
    );
  } finally {
    await removeFixtureRepo(repoPath);
  }
});

test('does not follow a symlink that leaves the repo', async () => {
  const outsideRepo = await createFixtureRepo({ 'secret.md': '# Secret heading\n' });
  const repoPath = await createFixtureRepo({
    'README.md': '[sneaky](docs/linked.md#secret-heading) [fine](docs/real.md)',
    'docs/real.md': '# Real\n',
  });

  try {
    await symlink(join(outsideRepo, 'secret.md'), join(repoPath, 'docs', 'linked.md'));
    const result = await findBrokenLinks(repoPath);
    assert.deepEqual(
      result.brokenLinks.map((link) => `${link.url}: ${link.reason}`),
      ['docs/linked.md#secret-heading: points outside the repo'],
    );
  } finally {
    await removeFixtureRepo(repoPath);
    await removeFixtureRepo(outsideRepo);
  }
});
