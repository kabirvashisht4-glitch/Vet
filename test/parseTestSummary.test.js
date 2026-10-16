// Checks that end-of-run totals are read correctly from each test tool's output.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTestSummary } from '../src/parseTestSummary.js';

test('reads Jest totals', () => {
  const output = 'Test Suites: 1 failed, 1 passed, 2 total\nTests:       1 failed, 1 skipped, 3 passed, 5 total';
  assert.deepEqual(parseTestSummary(output), { passed: 3, failed: 1, skipped: 1 });
});

test('reads Vitest totals', () => {
  const output = ' Test Files  1 failed | 1 passed (2)\n      Tests  1 failed | 4 passed (5)';
  assert.deepEqual(parseTestSummary(output), { passed: 4, failed: 1, skipped: 0 });
});

test('reads Mocha totals', () => {
  const output = '  1 passing (5ms)\n  1 failing\n  2 pending';
  assert.deepEqual(parseTestSummary(output), { passed: 1, failed: 1, skipped: 2 });
});

test('reads pytest totals', () => {
  const output = '=================== 1 failed, 1 passed, 1 skipped in 0.12s ====================';
  assert.deepEqual(parseTestSummary(output), { passed: 1, failed: 1, skipped: 1 });
});

test('counts only top-level go tests', () => {
  const output = '--- PASS: TestAdd (0.00s)\n    --- PASS: TestSub/negative (0.00s)\n--- FAIL: TestSub (0.00s)';
  assert.deepEqual(parseTestSummary(output), { passed: 1, failed: 1, skipped: 0 });
});

test('adds up cargo totals across test binaries', () => {
  const output =
    'test result: FAILED. 1 passed; 1 failed; 0 ignored; 0 measured\n' +
    'test result: ok. 0 passed; 0 failed; 1 ignored; 0 measured';
  assert.deepEqual(parseTestSummary(output), { passed: 1, failed: 1, skipped: 1 });
});

test('reads RSpec totals, where examples is the total', () => {
  assert.deepEqual(parseTestSummary('14 examples, 1 failure, 2 pending'), { passed: 11, failed: 1, skipped: 2 });
});

test('ignores terminal colors', () => {
  const output = '\x1b[1mTests:\x1b[22m \x1b[32m2 passed\x1b[39m, 2 total';
  assert.deepEqual(parseTestSummary(output), { passed: 2, failed: 0, skipped: 0 });
});

test('returns null for output with no known summary', () => {
  assert.equal(parseTestSummary('hello world\nall good'), null);
});

for (const prefix of ['#', 'ℹ']) {
  test(`reads Node test runner totals with ${prefix} prefix`, () => {
    const output = ['tests 62', 'suites 0', 'pass 60', 'fail 1', 'cancelled 0', 'skipped 1', 'todo 0']
      .map((line) => `${prefix} ${line}`).join('\n');
    assert.deepEqual(parseTestSummary(output), { passed: 60, failed: 1, skipped: 1 });
  });
}

test('counts Node todo tests as skipped and cancelled tests as failed', () => {
  const output = '# tests 6\n# pass 1\n# fail 1\n# cancelled 2\n# skipped 1\n# todo 1';
  assert.deepEqual(parseTestSummary(output), { passed: 1, failed: 3, skipped: 2 });
});

test('reads empty Node test runs', () => {
  assert.deepEqual(parseTestSummary('ℹ tests 0\nℹ pass 0\nℹ fail 0\nℹ skipped 0'),
    { passed: 0, failed: 0, skipped: 0 });
});

test('does not mistake arbitrary TAP comments for a Node summary', () => {
  assert.equal(parseTestSummary('# pass 2\n# tests are useful'), null);
});
