/**
 * 必須入力フィールドを示す赤いアスタリスク。
 *
 * 同じマークが `Channels` / `Contact` / `AuthField` に別々のスタイルでコピーされ、
 * 色・余白・`aria-hidden` の有無がずれていたため、単一のコンポーネントへ集約した。
 *
 * - 色は `text-red-600` (#dc2626)。白背景でのコントラスト比は約 4.83:1 で、
 *   WCAG 2.1 達成基準 1.4.3 (レベルAA) が通常テキストに求める 4.5:1 を満たす。
 *   `text-red-500` (#ef4444) は約 3.76:1 で基準を下回るため使用しない。
 * - `aria-hidden="true"` により支援技術からは読み上げられない。必須であることは
 *   `<input required>` を通じて支援技術へ伝わるため、視覚的な補助表現に徹する。
 */
export function RequiredMark() {
  return (
    <span className="text-red-600 ml-1" aria-hidden="true">
      *
    </span>
  );
}
