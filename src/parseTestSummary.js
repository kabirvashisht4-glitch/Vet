// Reads the pass/fail totals a test tool prints at the end of its run. Every
// tool words this differently, so each known format gets its own small reader.
import { stripColors } from './stripColors.js';

const SUMMARY_READERS = [
  readCargoSummary,
  readJestOrVitestSummary,
  readPytestSummary,
  readRspecSummary,
  readMochaSummary,
  readNodeSummary,
  readGoSummary,
];

const WORD_BUCKETS = {
  passed: 'passed',
  passing: 'passed',
  failed: 'failed',
  failing: 'failed',
  failure: 'failed',
  failures: 'failed',
  error: 'failed',
  errors: 'failed',
  skipped: 'skipped',
  pending: 'skipped',
  todo: 'skipped',
};

export function parseTestSummary(output) {
  const text = stripColors(output);
  for (const readSummary of SUMMARY_READERS) {
    const summary = readSummary(text);
    if (summary) return summary;
  }
  return null;
}

// cargo test: "test result: ok. 5 passed; 0 failed; 1 ignored; ..." (once per test binary)
function readCargoSummary(text) {
  const counts = { passed: 0, failed: 0, skipped: 0 };
  let found = false;
  for (const match of text.matchAll(/test result: \w+\. (\d+) passed; (\d+) failed; (\d+) ignored/g)) {
    found = true;
    counts.passed += Number(match[1]);
    counts.failed += Number(match[2]);
    counts.skipped += Number(match[3]);
  }
  return found ? counts : null;
}

// Jest: "Tests:  1 failed, 12 passed, 13 total"    Vitest: "Tests  1 failed | 12 passed (13)"
function readJestOrVitestSummary(text) {
  return sumWordCounts(text.match(/^\s*Tests:?\s+.*\d+ (?:passed|failed).*$/gm));
}

// pytest: "===== 1 failed, 12 passed, 2 skipped in 0.52s ====="
function readPytestSummary(text) {
  return sumWordCounts(text.match(/^.*\d+ (?:passed|failed|errors?)\b.* in [\d.]+s\b.*$/gm));
}

// RSpec: "14 examples, 1 failure, 2 pending" (examples is the total, not the passes)
function readRspecSummary(text) {
  const counts = { passed: 0, failed: 0, skipped: 0 };
  let found = false;
  for (const match of text.matchAll(/(\d+) examples?, (\d+) failures?(?:, (\d+) pending)?/g)) {
    found = true;
    const failed = Number(match[2]);
    const skipped = Number(match[3] || 0);
    counts.passed += Number(match[1]) - failed - skipped;
    counts.failed += failed;
    counts.skipped += skipped;
  }
  return found ? counts : null;
}

// Mocha: "12 passing (40ms)", "1 failing", "2 pending"
function readMochaSummary(text) {
  const resultLines = text.match(/^\s*\d+ (?:passing|failing)\b.*$/gm);
  if (!resultLines) return null;
  const pendingLines = text.match(/^\s*\d+ pending\b.*$/gm) || [];
  return sumWordCounts([...resultLines, ...pendingLines]);
}

// Node's TAP and spec reporters put the label before the count.
function readNodeSummary(text) {
  if (!/^[#ℹ] tests \d+\s*$/m.test(text)) return null;
  const buckets = { pass: 'passed', fail: 'failed', cancelled: 'failed', skipped: 'skipped', todo: 'skipped' };
  const counts = { passed: 0, failed: 0, skipped: 0 };
  for (const match of text.matchAll(/^[#ℹ] (pass|fail|cancelled|skipped|todo) (\d+)\s*$/gm)) {
    counts[buckets[match[1]]] += Number(match[2]);
  }
  return counts;
}

// go test -v: one unindented "--- PASS: TestName" line per top-level test
function readGoSummary(text) {
  const passed = (text.match(/^--- PASS:/gm) || []).length;
  const failed = (text.match(/^--- FAIL:/gm) || []).length;
  const skipped = (text.match(/^--- SKIP:/gm) || []).length;
  if (passed + failed + skipped === 0) return null;
  return { passed, failed, skipped };
}

function sumWordCounts(lines) {
  if (!lines) return null;

  const counts = { passed: 0, failed: 0, skipped: 0 };
  for (const line of lines) {
    for (const match of line.matchAll(/(\d+) ([a-z]+)\b/g)) {
      const bucket = WORD_BUCKETS[match[2]];
      if (bucket) counts[bucket] += Number(match[1]);
    }
  }
  return counts;
}
