#!/usr/bin/env node
/**
 * workflow-health-check.yml の Scan ステップの判定ロジック。
 *
 * ワークフローは schedule / workflow_dispatch でしか動かないため、判定を
 * inline の bash + jq に書くと PR の CI では一度も実行されず、回帰テストも
 * 持てない。判定を純関数として切り出し、`scripts/evaluate-workflow-health.test.mjs`
 * を `ci.yml` で実行する。GitHub API の呼び出しはワークフロー側に残す。
 *
 * 判定ルール:
 *   1. 直近 N 件に `startup_failure` を含む → 回復判定に関係なく検出する。
 *      特定のイベントだけが起動段階で失敗する事態 (PR #336) は、他のイベントの
 *      run が成功していても続くため。
 *   2. 直近 N 件の失敗 (failure / startup_failure / timed_out) がしきい値以上で、
 *      既定ブランチの最新の完了 run が success でなければ検出する (chronic failure)。
 *      最新の完了 run が success なら回復済みとして検出しない (#1064)。
 *      - pull_request の run は回復判定に使わない (PR の差分スキャンの成功で
 *        既定ブランチの失敗を回復済みと誤判定しないため)
 *      - cancelled / skipped は成否を示さないので、その前の run で判定する
 *      - 既定ブランチの run が無い場合は回復と判定できないので、件数だけで判定する
 *
 * CLI (ワークフローからの呼び出し):
 *   stdin: {"recentRuns": [...], "defaultBranchRuns": [...], "recentRunLimit": 10, "chronicFailureThreshold": 3}
 *   stdout: {"problem": boolean, "reasons": string[], "startupFailures": number, "failureCount": number}
 */

const FAILURE_CONCLUSIONS = new Set([
  'failure',
  'startup_failure',
  'timed_out',
]);
const NON_VERDICT_CONCLUSIONS = new Set(['cancelled', 'skipped']);

/**
 * 既定ブランチの完了 run から、回復の判定に使う最新の conclusion を返す。
 * @param {Array<{conclusion?: string|null, event?: string}>} defaultBranchRuns 新しい順
 * @returns {string} 判定できる run が無ければ空文字
 */
export function latestVerdictConclusion(defaultBranchRuns) {
  const run = defaultBranchRuns.find(
    (r) =>
      r.event !== 'pull_request' && !NON_VERDICT_CONCLUSIONS.has(r.conclusion),
  );
  return run?.conclusion ?? '';
}

/**
 * @param {object} input
 * @param {Array<{conclusion?: string|null}>} input.recentRuns 直近 N 件の run
 * @param {Array<{conclusion?: string|null, event?: string}>} input.defaultBranchRuns 既定ブランチの完了 run (新しい順)
 * @param {number} input.recentRunLimit
 * @param {number} input.chronicFailureThreshold
 */
export function evaluateWorkflowHealth({
  recentRuns,
  defaultBranchRuns,
  recentRunLimit,
  chronicFailureThreshold,
}) {
  const startupFailures = recentRuns.filter(
    (r) => r.conclusion === 'startup_failure',
  ).length;
  const failureCount = recentRuns.filter((r) =>
    FAILURE_CONCLUSIONS.has(r.conclusion),
  ).length;
  const latest = latestVerdictConclusion(defaultBranchRuns);

  const reasons = [];
  if (startupFailures > 0) {
    reasons.push(
      `startup_failure x${startupFailures} in last ${recentRunLimit}`,
    );
  }
  if (latest !== 'success' && failureCount >= chronicFailureThreshold) {
    reasons.push(`chronic failures: ${failureCount}/${recentRunLimit}`);
  }
  return {
    problem: reasons.length > 0,
    reasons,
    startupFailures,
    failureCount,
  };
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  process.stdout.write(
    `${JSON.stringify(evaluateWorkflowHealth(JSON.parse(raw)))}\n`,
  );
}

if (import.meta.main ?? process.argv[1] === new URL(import.meta.url).pathname) {
  await main();
}
