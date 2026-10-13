# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "duckduckgo-search==7.3.2",
#   "requests==2.34.2",
# ]
# ///

import os
import sys
import warnings

# Suppress RuntimeWarning from duckduckgo-search (as requested in memories)
with warnings.catch_warnings():
    warnings.simplefilter("ignore", RuntimeWarning)
    from duckduckgo_search import DDGS

import requests


# 投稿済みコメントの識別用マーカー。同じ Issue への重複投稿を防ぐ（冪等化）。
MARKER = "<!-- ai-research -->"
# リサーチコメントの投稿者。GITHUB_TOKEN で投稿したコメントの user.login はこの値になる。
BOT_LOGIN = "github-actions[bot]"


def sanitize_title(title):
    """検索結果のタイトルを Markdown リンクテキストとして安全な形にする。

    改行を空白にし、リンクを壊す [ ] とメンションになる @ を除去する。
    """
    cleaned = " ".join(title.split())
    for ch in "[]@":
        cleaned = cleaned.replace(ch, "")
    return cleaned.strip()


def escape_link_destination(url):
    """Markdown リンク先として安全な形にする。

    対応する開き括弧のない ) や空白・山括弧でリンクが途切れないよう、パーセントエンコードする。
    """
    for ch, encoded in (("(", "%28"), (")", "%29"), (" ", "%20"), ("<", "%3C"), (">", "%3E")):
        url = url.replace(ch, encoded)
    return url


def fail(message):
    """GitHub Actions のエラー注釈を出力して非ゼロ終了する。"""
    print(f"::error::{message}")
    sys.exit(1)


def has_research_comment(comments_url, headers):
    """Issue に投稿済みのリサーチコメント（MARKER 入りで投稿者が BOT_LOGIN）があるかを返す。

    他のユーザーが MARKER を含むコメントを書いても、検索を省略しない。
    """
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
        if any(
            MARKER in (c.get("body") or "") and (c.get("user") or {}).get("login") == BOT_LOGIN
            for c in comments
        ):
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
        results = DDGS().text(issue_title, backend="duckduckgo", max_results=5)
    except Exception as e:
        fail(f"Web 検索に失敗しました (レート制限や仕様変更の可能性があります): {e}")

    results = [r for r in (results or []) if r.get("href")]
    if not results:
        fail("検索結果が 0 件でした。コメントは投稿しません。")

    comment_body = f"{MARKER}\n## AI リサーチ結果\n\nIssueのタイトルに基づいて自動的にWeb検索を行いました。\n\n"
    for r in results:
        href = escape_link_destination(r["href"])
        title = sanitize_title(r.get("title") or "") or href
        comment_body += f"- [{title}]({href})\n"

        # Jina Reader APIを利用してページ内容の一部を取得
        try:
            reader_response = requests.get(f"https://r.jina.ai/{r['href']}", timeout=10)
            if reader_response.status_code == 200:
                content = reader_response.text
                # 概要として最初の500文字を抽出して追加
                snippet = content[:500].replace('\n', ' ').strip()
                if len(content) > 500:
                    snippet += "..."
                comment_body += f"  > {snippet}\n\n"
            else:
                comment_body += f"  > *(コンテンツを取得できませんでした: HTTP {reader_response.status_code})*\n\n"
        except Exception:
            comment_body += f"  > *(コンテンツを取得できませんでした)*\n\n"

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
