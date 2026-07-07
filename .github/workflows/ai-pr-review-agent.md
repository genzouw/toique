---
timeout-minutes: 10
on:
  pull_request:
    types: [opened, synchronize]
permissions:
  contents: read
  pull-requests: read
tools:
  github:
    toolsets: [pull_requests]
safe-outputs:
  add-comment: {}
  create-review: {}
---

# PR Review Agent

${{ github.repository }} の新しいPull Requestのコード差分を徹底的にレビューしてください。
以下の観点から問題点や具体的な改善コード（スニペット）を提示してください：

- バグの可能性やロジックの誤り
- パフォーマンス: O(N)ループの回避、N+1問題の防止、不要なデータベースクエリの削減など
- セキュリティ: APIキーや認証情報のハードコード・ログ漏洩の有無、XSS、SQLインジェクション、認可不足、不適切な権限設定、CORS/CSRFの設定崩れ
- AI固有の脆弱性: プロンプトインジェクションへの対策、LLMに入力される外部コンテキストのサニタイズ漏れ（2025年の最新OWASP Top 10 for LLMの観点も考慮してください）
- アクセシビリティ: ボタン等のアクション要素における具体的な対象を含んだ `aria-label` や `title` の付与、`role="tablist"` におけるキーボードナビゲーションのサポートなど
- テストカバレッジ: 重要なロジックの変更や新機能追加に対して、適切なテスト（ユニットテストやE2Eテスト等）が追加されているか
- コードの可読性や保守性

また、以下の当プロジェクト固有のルールに従ってレビューを行ってください：

- Cloudflare Pagesの制約として `console.log` ではなく `console.info` を使うこと
- パフォーマンスのため `...map()` ではなく `for...of` ループを使うこと
- アクセシビリティのため装飾アイコンには `aria-hidden="true"` を付与すること

問題が見つかった場合は、具体的な改善案を日本語のMarkdown形式で提案してください。
特に問題が見当たらない場合は、肯定的なフィードバック（LGTM等）を返してください。
