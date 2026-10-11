# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "ddgs==9.16.0",
#   "requests==2.34.2",
# ]
# ///

import os
import sys

import requests
from ddgs import DDGS


def fail(message):
    """GitHub Actions のエラー注釈を出力して非ゼロ終了する。"""
    print(f"::error::{message}")
    sys.exit(1)


def main():
    print("AI リサーチパイプラインを開始します...")
    issue_title = os.environ.get("ISSUE_TITLE", "")
    issue_number = os.environ.get("ISSUE_NUMBER", "")
    repo_name = os.environ.get("REPO_NAME", "")
    github_token = os.environ.get("GITHUB_TOKEN", "")

    if not issue_title or not issue_number or not repo_name or not github_token:
        fail("必要な環境変数 (ISSUE_TITLE / ISSUE_NUMBER / REPO_NAME / GITHUB_TOKEN) が不足しています。")

    print(f"トピックを調査中: {issue_title}")

    try:
        results = DDGS().text(issue_title, max_results=5)
    except Exception as e:
        fail(f"Web 検索に失敗しました (レート制限や仕様変更の可能性があります): {e}")

    results = [r for r in (results or []) if r.get("href")]
    if not results:
        fail("検索結果が 0 件でした。コメントは投稿しません。")

    comment_body = "## AI リサーチ結果\n\nIssueのタイトルに基づいて自動的にWeb検索を行いました。\n\n"
    for r in results:
        href = r["href"]
        title = r.get("title") or href
        comment_body += f"- [{title}]({href})\n"

    print("検索が完了しました。Issueにコメントを追加します。")

    url = f"https://api.github.com/repos/{repo_name}/issues/{issue_number}/comments"
    headers = {
        "Authorization": f"Bearer {github_token}",
        "Accept": "application/vnd.github.v3+json",
    }

    try:
        response = requests.post(url, headers=headers, json={"body": comment_body}, timeout=30)
    except requests.RequestException as e:
        fail(f"Issue へのコメント投稿リクエストに失敗しました: {e}")

    if response.status_code != 201:
        fail(f"Issue へのコメント追加に失敗しました: {response.status_code} - {response.text}")

    print("Issue へのコメント追加が成功しました。")
    print("AI リサーチパイプラインが正常に完了しました。")


if __name__ == "__main__":
    main()
