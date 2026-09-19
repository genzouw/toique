#!/usr/bin/env node
/**
 * PR タイトルを Conventional Commits 形式へ正規化する。
 *
 * 背景:
 *   Jules のスケジュール実行エージェント (Palette / Bolt / Sentinel) は
 *   `🎨 Palette: …` のような固定接頭辞でタイトルを生成する。この接頭辞は
 *   Jules の Web UI 側に書かれていてリポジトリからは変更できないため、
 *   AGENTS.md に「PR タイトルは Conventional Commits に従う」と書いても
 *   守られず、Semantic PR Title Check が落ちてオーナーが毎回手で
 *   リネームする、という事象が繰り返し発生していた (#737 #740 #743 #744
 *   #751 #752 #754 #757 #769 #777 #780 #783 #849 #858 #859)。
 *
 *   本スクリプトはその後始末を自動化する。`.github/workflows/semantic-pr-title.yml`
 *   の normalize ジョブから呼ばれ、タイトルが規約違反のときだけ
 *   type/scope を機械的に決めて `gh pr edit` で貼り直す。
 *
 * 型の決め方 (上から順に採用):
 *   1. PR のコミットメッセージ先頭行のうち、最初に現れる Conventional Commits
 *      形式のもの。エージェントはタイトルが崩れていてもコミットは規約通りに
 *      書けていることが多く、PR 本人が申告した型なので最も信頼できる。
 *   2. Jules ペルソナの固定接頭辞 → 型の対応表 (PERSONA_TYPES)。
 *   3. どちらも取れない場合は改名しない (`manual`)。誤った型を機械的に
 *      付けるより、人間に判断させたほうが安全なため。
 *
 * 元のタイトルは捨てずに subject としてそのまま残す。
 *   例: `🎨 Palette: 装飾アイコンに aria-hidden を追加`
 *     → `fix(a11y): 🎨 Palette: 装飾アイコンに aria-hidden を追加`
 *
 * CLI (ワークフローからの呼び出し):
 *   PR_TITLE='…' PR_COMMITS=$'headline1\nheadline2' node scripts/normalize-pr-title.mjs
 *   → {"action":"rename"|"none"|"manual","title":"…","reason":"…"} を stdout へ出力
 */

import { pathToFileURL } from 'node:url';

// @commitlint/config-conventional (commitlint.config.js が extends している)
// が許可する type。amannn/action-semantic-pull-request の既定値とも一致する。
export const ALLOWED_TYPES = [
  'build',
  'chore',
  'ci',
  'docs',
  'feat',
  'fix',
  'perf',
  'refactor',
  'revert',
  'style',
  'test',
];

// GitHub の issue / PR タイトルの上限。これを超える改名はしない。
const TITLE_MAX_LENGTH = 256;

const CONVENTIONAL_RE = new RegExp(
  `^(${ALLOWED_TYPES.join('|')})(\\([^)]*\\))?(!)?: (.+)$`,
  's',
);

// Jules ペルソナ名 → 付与する type/scope。
// ペルソナは 1 つの目的しか持たないため、名前から型が一意に決まる。
// 新しいペルソナを Jules 側に追加したらここにも追記する。
export const PERSONA_TYPES = {
  bolt: 'perf', // ⚡ Bolt: パフォーマンス最適化
  sentinel: 'fix(security)', // 🛡️ Sentinel: 脆弱性修正
  palette: 'fix(a11y)', // 🎨 Palette: アクセシビリティ / UX 改善
};

// 先頭の絵文字・記号・空白を読み飛ばしてペルソナ名を拾う。
const PERSONA_RE = new RegExp(
  `^[^\\p{L}\\p{N}]*(${Object.keys(PERSONA_TYPES).join('|')})\\s*[:：]`,
  'iu',
);

// マージコミットと、レビュー指摘への追従コミット。
// いずれも PR の主題ではないため型の決定材料から除外する。
const MERGE_COMMIT_RE = /^Merge\s/;
const FOLLOW_UP_COMMIT_RE = /\[(self review|code review)\]/i;

/**
 * subjectPattern `^(?![A-Z]).+$` (先頭が大文字でないこと) に合わせる。
 * `Add …` のような通常語のみ小文字化し、`API …` のような連続大文字は
 * 語義が壊れるため触らない (その場合は改名せず人間に委ねる)。
 */
function lowerFirst(subject) {
  return /^[A-Z][a-z]/.test(subject)
    ? subject[0].toLowerCase() + subject.slice(1)
    : subject;
}

function startsWithUpperCase(subject) {
  return /^[A-Z]/.test(subject);
}

function deriveTypeFromCommits(commitHeadlines) {
  for (const headline of commitHeadlines) {
    const line = (headline ?? '').trim();
    if (!line) continue;
    if (MERGE_COMMIT_RE.test(line)) continue;
    if (FOLLOW_UP_COMMIT_RE.test(line)) continue;
    const matched = CONVENTIONAL_RE.exec(line);
    if (matched) return `${matched[1]}${matched[2] ?? ''}`;
  }
  return null;
}

function deriveTypeFromPersona(title) {
  const matched = PERSONA_RE.exec(title);
  if (!matched) return null;
  return PERSONA_TYPES[matched[1].toLowerCase()] ?? null;
}

/**
 * @param {{ title: string, commitHeadlines?: string[] }} input
 * @returns {{ action: 'none'|'rename'|'manual', title: string, reason: string }}
 *   action=none   … 変更不要
 *   action=rename … title を新しいタイトルへ貼り直す
 *   action=manual … 機械的に直せない。人間が付け直す
 */
export function normalizePrTitle({ title, commitHeadlines = [] }) {
  const original = (title ?? '').trim();
  if (!original) {
    return { action: 'manual', title: original, reason: 'empty-title' };
  }

  const matched = CONVENTIONAL_RE.exec(original);
  if (matched) {
    const subject = matched[4];
    const lowered = lowerFirst(subject);
    if (lowered === subject) {
      return {
        action: 'none',
        title: original,
        reason: 'already-conventional',
      };
    }
    const prefix = `${matched[1]}${matched[2] ?? ''}${matched[3] ?? ''}`;
    return {
      action: 'rename',
      title: `${prefix}: ${lowered}`,
      reason: 'subject-starts-with-uppercase',
    };
  }

  const fromCommits = deriveTypeFromCommits(commitHeadlines);
  const type = fromCommits ?? deriveTypeFromPersona(original);
  if (!type) {
    return { action: 'manual', title: original, reason: 'no-type-signal' };
  }

  const subject = lowerFirst(original);
  if (startsWithUpperCase(subject)) {
    // 連続大文字始まり。型を足しても subjectPattern で落ちるので改名しない。
    return {
      action: 'manual',
      title: original,
      reason: 'subject-starts-with-acronym',
    };
  }

  const renamed = `${type}: ${subject}`;
  if (renamed.length > TITLE_MAX_LENGTH) {
    return { action: 'manual', title: original, reason: 'title-too-long' };
  }

  return {
    action: 'rename',
    title: renamed,
    reason: fromCommits ? 'type-from-commits' : 'type-from-persona',
  };
}

const invokedAsCli =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedAsCli) {
  const result = normalizePrTitle({
    title: process.env.PR_TITLE ?? '',
    commitHeadlines: (process.env.PR_COMMITS ?? '').split('\n'),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
