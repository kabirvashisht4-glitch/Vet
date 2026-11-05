// Checks that code, comment and blank lines are counted the way cloc and scc do.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countLines } from '../src/countLines.js';
import { detectLanguages } from '../src/detectLanguage.js';
import javascript from '../src/detectors/javascript.js';
import python from '../src/detectors/python.js';
import { detectors } from '../src/detectors/index.js';
import { createFixtureRepo, removeFixtureRepo } from './fixtureRepo.js';

test('counts JavaScript lines, including one-line and multi-line block comments', () => {
  const source = [
    '// A comment',
    'const a = 1; // code with a trailing comment',
    '',
    '/* one-line block */',
    '/**',
    ' * Multi-line',
    ' */',
    'function add() {}',
    '', // just the file's final newline, not a blank line
  ].join('\n');

  assert.deepEqual(countLines(source, javascript), { code: 2, comment: 5, blank: 1 });
});

test('counts Python lines with # comments', () => {
  assert.deepEqual(countLines('# note\nx = 1\n\nprint(x)\n', python), { code: 2, comment: 1, blank: 1 });
});

test('reports each language with its share of all code lines', async () => {
  const repoPath = await createFixtureRepo({
    'app.js': 'a();\nb();\nc();\n',
    'tool.py': 'x = 1\n',
    'README.md': '# Not code\n',
  });

  try {
    const languages = await detectLanguages(repoPath);
    const summary = languages.map((language) => `${language.name} ${language.code} ${language.percent}%`);
    assert.deepEqual(summary, ['JavaScript 3 75%', 'Python 1 25%']);
  } finally {
    await removeFixtureRepo(repoPath);
  }
});

test('counts Kotlin lines in .kt and .kts files', async () => {
  const kotlin = detectors.find((detector) => detector.name === 'Kotlin');
  assert.ok(kotlin, 'Kotlin detector is registered');
  const source = [
    '/**',
    ' * Says hello.',
    ' */',
    'fun main() {',
    '    // greet',
    '    println("Hello")',
    '}',
    '',
  ].join('\n');
  assert.deepEqual(countLines(source, kotlin), { code: 3, comment: 4, blank: 0 });

  const repoPath = await createFixtureRepo({
    'src/Main.kt': source,
    'build.gradle.kts': 'plugins {\n    kotlin("jvm")\n}\n',
  });

  try {
    const languages = await detectLanguages(repoPath);
    const summary = languages.map((language) => `${language.name} ${language.code} ${language.percent}%`);
    assert.deepEqual(summary, ['Kotlin 6 100%']);
  } finally {
    await removeFixtureRepo(repoPath);
  }
});
