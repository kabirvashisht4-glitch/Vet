// Checks which findings make vet exit with "problems found".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findExitProblems, parseMinScore } from '../src/exitStatus.js';

function report({ brokenLinks = [], commandResults = null, score = 10 }) {
  return {
    score: { score },
    links: { brokenLinks },
    tests: { testRun: commandResults ? { commandResults } : null },
  };
}

test('no broken links and passing tests means no problems', () => {
  assert.deepEqual(findExitProblems(report({ commandResults: [{ exitCode: 0 }] })), []);
});

test('broken links and failing test commands are both reported', () => {
  const problems = findExitProblems(
    report({ brokenLinks: [{}, {}], commandResults: [{ exitCode: 0 }, { exitCode: 1 }] }),
  );
  assert.deepEqual(problems, ['2 broken link(s)', '1 failing test command(s)']);
});

test('tests that were not run are not a problem', () => {
  assert.deepEqual(findExitProblems(report({ commandResults: null })), []);
});

test('a score below --min-score is a problem, but at or above it is fine', () => {
  assert.deepEqual(findExitProblems(report({ score: 6.4 }), 7), ['a score of 6.4, below the minimum of 7']);
  assert.deepEqual(findExitProblems(report({ score: 7 }), 7), []);
  assert.deepEqual(findExitProblems(report({ score: 9.5 }), 7), []);
});

test('without --min-score the score never causes a problem', () => {
  assert.deepEqual(findExitProblems(report({ score: 0 })), []);
});

test('a score of 0 still counts when --min-score is 0.1', () => {
  assert.equal(findExitProblems(report({ score: 0 }), 0.1).length, 1);
});

test('parseMinScore accepts numbers from 0 to 10 and treats a missing flag as none', () => {
  assert.equal(parseMinScore(undefined), null);
  assert.equal(parseMinScore('0'), 0);
  assert.equal(parseMinScore('7.5'), 7.5);
  assert.equal(parseMinScore('10'), 10);
});

test('parseMinScore rejects anything else with a clear message', () => {
  for (const bad of ['abc', '-1', '10.1', '', '  ', 'Infinity', 'NaN']) {
    assert.throws(() => parseMinScore(bad), /--min-score must be a number from 0 to 10/, `"${bad}"`);
  }
});
