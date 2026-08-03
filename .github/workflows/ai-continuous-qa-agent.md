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
---

# Continuous QA Agent

${{ github.repository }} の新しいPull Requestに含まれるコード変更を分析し、品質保証（QA）とテストの観点から継続的改善を提案してください。
このAgentは、GitHub NextのAgentic Workflowsの概念に基づき、テストカバレッジの向上やエッジケースの発見を自動化することを目的としています。

以下の観点から、変更されたコードに対するテスト戦略と具体的なテストコード（スニペット）を提案してください：

- **未カバーのエッジケース**: 現在の差分で処理されていない可能性のある境界値や異常系入力はないか。
- **ユニットテストの提案**: 新規追加または変更されたロジックに対するVitest用のテストケース案（モックの利用方法を含む）。
- **E2Eテストの提案**: UI変更がある場合、Playwrightを用いたユーザーシナリオテストの追加案。
- **リグレッションリスク**: 既存の機能に影響を与えうる変更が含まれているかどうかの評価。

問題やテスト不足が見つかった場合は、具体的なテストコード（スニペット）とともに日本語のMarkdown形式で提案してください。
もし現在の変更に対して十分なテストが含まれており、追加の提案がない場合は、「現在の変更には十分なテストが含まれているようです。👍」とだけ回答してください。
