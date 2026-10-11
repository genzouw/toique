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


# 投稿済みコメントの識別用マーカー。同じ Issue への重複投稿を防ぐ（冪等化）。
MARKER = "<!-- ai-research -->"


def fail(message):
    """GitHub Actions のエラー注釈を出力して非ゼロ終了する。"""
    print(f"::error::{message}")
    sys.exit(1)


def has_research_comment(comments_url, headers):
    """Issue に投稿済みのリサーチコメント（MARKER 入り）があるかを返す。"""
    page = 1
    while True:
        try:
            response = requests.get(
                comments_url,
                headers=headers,
                params={"per_page": 100, "page": page},
                timeout=30,
            )
        except requests.RequestException as e:
            fail(f"Issue のコメント取得リクエストに失敗しました: {e}")
        if response.status_code != 200:
            fail(f"Issue のコメント取得に失敗しました: {response.status_code} - {response.text}")
        comments = response.json()
        if any(MARKER in (c.get("body") or "") for c in comments):
            return True
        if len(comments) < 100:
            return False
        page += 1


def main():
    print("AI リサーチパイプラインを開始します...")
    issue_title = os.environ.get("ISSUE_TITLE", "")
    issue_number = os.environ.get("ISSUE_NUMBER", "")
    repo_name = os.environ.get("REPO_NAME", "")
    github_token = os.environ.get("GITHUB_TOKEN", "")

    if not issue_title or not issue_number or not repo_name or not github_token:
        fail("必要な環境変数 (ISSUE_TITLE / ISSUE_NUMBER / REPO_NAME / GITHUB_TOKEN) が不足しています。")

    comments_url = f"https://api.github.com/repos/{repo_name}/issues/{issue_number}/comments"
    headers = {
        "Authorization": f"Bearer {github_token}",
        "Accept": "application/vnd.github.v3+json",
    }

    if has_research_comment(comments_url, headers):
        print("既にリサーチコメントが投稿済みのため、処理をスキップします。")
        return

    print(f"トピックを調査中: {issue_title}")

    try:
        results = DDGS().text(issue_title, max_results=5)
    except Exception as e:
        fail(f"Web 検索に失敗しました (レート制限や仕様変更の可能性があります): {e}")

    results = [r for r in (results or []) if r.get("href")]
    if not results:
        fail("検索結果が 0 件でした。コメントは投稿しません。")

    comment_body = f"{MARKER}\n## AI リサーチ結果\n\nIssueのタイトルに基づいて自動的にWeb検索を行いました。\n\n"
    for r in results:
        href = r["href"]
        title = r.get("title") or href
        comment_body += f"- [{title}]({href})\n"

    print("検索が完了しました。Issueにコメントを追加します。")

    try:
        response = requests.post(comments_url, headers=headers, json={"body": comment_body}, timeout=30)
    except requests.RequestException as e:
        fail(f"Issue へのコメント投稿リクエストに失敗しました: {e}")

    if response.status_code != 201:
        fail(f"Issue へのコメント追加に失敗しました: {response.status_code} - {response.text}")

    print("Issue へのコメント追加が成功しました。")
    print("AI リサーチパイプラインが正常に完了しました。")


if __name__ == "__main__":
    main()
