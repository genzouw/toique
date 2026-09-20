import { describe, expect, it } from 'bun:test';
import { normalizePrTitle } from './normalize-pr-title.mjs';

// fixture は実際に Semantic PR Title Check を落とし、オーナーが手で
// リネームした PR から採っている (rename イベントの from / to と、
// `gh pr view <n> --json commits` のコミット先頭行)。
// 将来ルールを変えたときに「過去に起きた失敗がまた素通りする」回帰を
// CI で検知できるようにするのが目的。
const REAL_WORLD_CASES = [
  {
    pr: 858,
    title:
      '🎨 Palette: リンク内の装飾用アイコンに対する aria-hidden 付与によるスクリーンリーダー読み上げ改善',
    commitHeadlines: [
      'feat(a11y): add aria-hidden to decorative ArrowRight icons in links',
    ],
    expected:
      'feat(a11y): 🎨 Palette: リンク内の装飾用アイコンに対する aria-hidden 付与によるスクリーンリーダー読み上げ改善',
  },
  {
    pr: 859,
    title:
      '⚡ Bolt: [performance improvement] ダッシュボードの利用状況取得クエリを db.batch で最適化',
    commitHeadlines: [
      'perf: batch Drizzle ORM queries to reduce database roundtrips',
      'fix: 🐛 [Self Review] db.batch を postgres-js 非対応のため Promise.all に戻す',
    ],
    expected:
      'perf: ⚡ Bolt: [performance improvement] ダッシュボードの利用状況取得クエリを db.batch で最適化',
  },
  {
    // コミットもペルソナ接頭辞で Conventional Commits になっていない場合は
    // ペルソナ名から型を決める。
    pr: 849,
    title: '🎨 Palette: アクション付きアイコンのアクセシビリティ改善',
    commitHeadlines: [
      '🎨 Palette: Add aria-hidden to decorative icons near text',
      "Merge branch 'main' into palette-a11y-icons-11417609688260192755",
    ],
    expected:
      'fix(a11y): 🎨 Palette: アクション付きアイコンのアクセシビリティ改善',
  },
  {
    pr: 783,
    title: '🎨 Palette: select要素のフォーカス視認性とローディング制御の改善',
    commitHeadlines: [
      'feat(ux): select 要素のフォーカスとローディング制御を追加',
      'fix(deps): 🔒 smol-toml を脆弱性修正版 (1.8.0) へ更新',
    ],
    expected:
      'feat(ux): 🎨 Palette: select要素のフォーカス視認性とローディング制御の改善',
  },
  {
    // マージコミットとレビュー追従コミットしか Conventional Commits でない
    // ケース。追従コミットの `fix` ではなくペルソナの `perf` を採る。
    pr: 744,
    title: '⚡ Bolt: React レンダリングのパフォーマンス最適化',
    commitHeadlines: [
      '⚡ Bolt: Submissionsページの不要な再レンダーを最適化',
      "Merge branch 'main' into bolt/react-render-optimization-1499577840400",
      'fix: 🐛 [Code Review] formsById の構築を Record から Map に変更',
    ],
    expected: 'perf: ⚡ Bolt: React レンダリングのパフォーマンス最適化',
  },
  {
    pr: 751,
    title:
      '🛡️ Sentinel: [HIGH] Fix timing attack vulnerability in signature verification',
    commitHeadlines: [
      'chore(security): 🔒 timingSafeEqual におけるタイミング攻撃の防止',
      "Merge branch 'main' into sentinel-secure-timing-safe-equal-8928988186",
    ],
    expected:
      'chore(security): 🛡️ Sentinel: [HIGH] Fix timing attack vulnerability in signature verification',
  },
  {
    // ペルソナ接頭辞が無く、コミットだけが手がかりのケース。
    pr: 752,
    title:
      '🎨 Palette: Add aria-hidden to decorative icons in FormSchemaBuilder',
    commitHeadlines: [
      'chore(ux): add aria-hidden to decorative icons in FormSchemaBuilder',
    ],
    expected:
      'chore(ux): 🎨 Palette: Add aria-hidden to decorative icons in FormSchemaBuilder',
  },
];

describe('normalizePrTitle', () => {
  it.each(REAL_WORLD_CASES)(
    'PR #$pr のタイトルを Conventional Commits へ正規化する',
    ({ title, commitHeadlines, expected }) => {
      const result = normalizePrTitle({ title, commitHeadlines });
      expect(result.action).toBe('rename');
      expect(result.title).toBe(expected);
    },
  );

  it('既に規約を満たすタイトルは変更しない', () => {
    const title = 'feat(a11y): 装飾アイコンに aria-hidden を付与する';
    expect(normalizePrTitle({ title, commitHeadlines: [] })).toEqual({
      action: 'none',
      title,
      reason: 'already-conventional',
    });
  });

  it('Dependabot のタイトルを壊さない', () => {
    const title =
      'chore(deps): bump better-auth from 1.7.4 to 1.7.5 in /backend';
    expect(normalizePrTitle({ title }).action).toBe('none');
  });

  it('subject が大文字始まりの規約タイトルは先頭だけ小文字化する', () => {
    // subjectPattern `^(?![A-Z]).+$` を満たすための最小限の修正。
    const result = normalizePrTitle({
      title: 'fix: Prevent rate limiter cache flood bypass',
    });
    expect(result).toEqual({
      action: 'rename',
      title: 'fix: prevent rate limiter cache flood bypass',
      reason: 'subject-starts-with-uppercase',
    });
  });

  it('型の手がかりが無いタイトルは改名せず人間に委ねる', () => {
    const result = normalizePrTitle({
      title: 'ダッシュボードの表示を調整',
      commitHeadlines: ["Merge branch 'main' into topic", 'wip'],
    });
    expect(result.action).toBe('manual');
    expect(result.reason).toBe('no-type-signal');
  });

  it('連続大文字で始まるタイトルは小文字化せず人間に委ねる', () => {
    // `API` を `aPI` にすると語義が壊れるため、機械的な改名はしない。
    const result = normalizePrTitle({
      title: 'API レスポンスのキャッシュ制御を見直す',
      commitHeadlines: ['refactor: rework cache headers'],
    });
    expect(result.action).toBe('manual');
    expect(result.reason).toBe('subject-starts-with-acronym');
  });

  it('type が既に付いていても subject が連続大文字始まりなら規約適合済み扱いにしない', () => {
    // `lowerFirst` は `AWS` のような連続大文字を変化させないため、
    // type 付きでも subjectPattern `^(?![A-Z]).+$` には違反したままになる。
    // これを `already-conventional` (none) にすると CI が fail するのに
    // 誰も気づけなくなるため、manual に倒して人間に委ねる。
    const result = normalizePrTitle({
      title: 'fix: AWS SDK 更新のためのリトライ処理修正',
      commitHeadlines: [],
    });
    expect(result.action).toBe('manual');
    expect(result.reason).toBe('subject-starts-with-acronym');
  });

  it('GitHub のタイトル長上限を超える改名はしない', () => {
    const result = normalizePrTitle({
      title: `🎨 Palette: ${'あ'.repeat(250)}`,
      commitHeadlines: ['feat(a11y): long change'],
    });
    expect(result.action).toBe('manual');
    expect(result.reason).toBe('title-too-long');
  });

  it('空タイトルは manual として扱う', () => {
    expect(normalizePrTitle({ title: '   ' }).action).toBe('manual');
  });
});
