---
timeout-minutes: 5
on:
  issue:
    types: [opened, reopened]
permissions:
  issues: read
tools:
  github:
    toolsets: [issues, labels]
safe-outputs:
  add-labels:
    allowed: [bug, enhancement, question, documentation, help-wanted]
  add-comment: {}
---

# Issue Triage Agent

${{ github.repository }} にある新しいIssueの内容（タイトルと本文）を分析し、適切なラベルを追加してください。
許可されているラベルは `bug`, `enhancement`, `question`, `documentation`, `help-wanted` です。

以下の条件に当てはまる場合はスキップしてください：
- すでにこれらのラベルのいずれかが付与されている場合
- すでに担当者（特にbot以外のユーザー）が割り当てられている場合

Issueのコンテキストやコードベースに基づいて分析を行い、ラベルを追加した後にIssueの作成者にメンションを付けて日本語でコメントを残してください。コメントでは、どのラベルを追加したかの説明とその理由、およびIssueの対応方針の簡単なサマリーを記載してください。
