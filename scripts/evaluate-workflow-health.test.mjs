import { describe, expect, it } from 'bun:test';
import {
  evaluateWorkflowHealth,
  latestVerdictConclusion,
} from './evaluate-workflow-health.mjs';

const base = { recentRunLimit: 10, chronicFailureThreshold: 3 };
const runs = (...conclusions) =>
  conclusions.map((conclusion) => ({ conclusion }));
const mainRuns = (...conclusions) =>
  conclusions.map((conclusion) => ({ conclusion, event: 'push' }));

describe('evaluateWorkflowHealth', () => {
  it('古い失敗が直近 N 件に残るが、既定ブランチの最新の完了 run が success なら検出しない (#1064)', () => {
    const result = evaluateWorkflowHealth({
      ...base,
      recentRuns: runs('success', 'failure', 'failure', 'failure', 'success'),
      defaultBranchRuns: mainRuns('success', 'failure', 'failure', 'failure'),
    });
    expect(result.problem).toBe(false);
    expect(result.reasons).toEqual([]);
  });

  it('最新の完了 run が failure で、失敗件数がしきい値以上なら検出する', () => {
    const result = evaluateWorkflowHealth({
      ...base,
      recentRuns: runs('failure', 'failure', 'failure', 'success'),
      defaultBranchRuns: mainRuns('failure', 'failure', 'failure'),
    });
    expect(result.problem).toBe(true);
    expect(result.reasons).toEqual(['chronic failures: 3/10']);
  });

  it('失敗件数がしきい値未満なら検出しない', () => {
    const result = evaluateWorkflowHealth({
      ...base,
      recentRuns: runs('failure', 'failure', 'success'),
      defaultBranchRuns: mainRuns('failure', 'failure', 'success'),
    });
    expect(result.problem).toBe(false);
  });

  it('最新の完了 run が cancelled / skipped なら、その前の run で判定する', () => {
    const recovered = evaluateWorkflowHealth({
      ...base,
      recentRuns: runs(
        'cancelled',
        'skipped',
        'success',
        'failure',
        'failure',
        'failure',
      ),
      defaultBranchRuns: mainRuns('cancelled', 'skipped', 'success', 'failure'),
    });
    expect(recovered.problem).toBe(false);

    const stillFailing = evaluateWorkflowHealth({
      ...base,
      recentRuns: runs('cancelled', 'failure', 'failure', 'failure'),
      defaultBranchRuns: mainRuns('cancelled', 'skipped', 'failure'),
    });
    expect(stillFailing.problem).toBe(true);
  });

  it('pull_request の run の success は回復判定に使わない', () => {
    const result = evaluateWorkflowHealth({
      ...base,
      recentRuns: runs('success', 'failure', 'failure', 'failure'),
      defaultBranchRuns: [
        { conclusion: 'success', event: 'pull_request' },
        { conclusion: 'failure', event: 'push' },
      ],
    });
    expect(result.problem).toBe(true);
  });

  it('直近 N 件に startup_failure を含むなら、回復判定に関係なく検出する', () => {
    const result = evaluateWorkflowHealth({
      ...base,
      recentRuns: runs('success', 'startup_failure', 'success'),
      defaultBranchRuns: mainRuns('success'),
    });
    expect(result.problem).toBe(true);
    expect(result.reasons).toEqual(['startup_failure x1 in last 10']);
  });

  it('startup_failure と chronic failure が両方該当すれば理由を 2 件返す', () => {
    const result = evaluateWorkflowHealth({
      ...base,
      recentRuns: runs('startup_failure', 'failure', 'timed_out'),
      defaultBranchRuns: mainRuns('failure'),
    });
    expect(result.reasons).toEqual([
      'startup_failure x1 in last 10',
      'chronic failures: 3/10',
    ]);
  });

  it('既定ブランチの run が無い (pull_request だけで動く) 場合は件数で判定する', () => {
    const failing = evaluateWorkflowHealth({
      ...base,
      recentRuns: runs('failure', 'failure', 'failure'),
      defaultBranchRuns: [],
    });
    expect(failing.problem).toBe(true);

    const healthy = evaluateWorkflowHealth({
      ...base,
      recentRuns: runs('success', 'failure'),
      defaultBranchRuns: [],
    });
    expect(healthy.problem).toBe(false);
  });
});

describe('latestVerdictConclusion', () => {
  it('判定できる run が無ければ空文字を返す', () => {
    expect(latestVerdictConclusion([])).toBe('');
    expect(latestVerdictConclusion(mainRuns('cancelled', 'skipped'))).toBe('');
  });
});
