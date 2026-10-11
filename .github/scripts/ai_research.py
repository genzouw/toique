# /// script
# dependencies = [
#   "duckduckgo-search",
#   "requests",
# ]
# ///

import os
import sys
import json
import warnings
import requests

# duckduckgo_search からの RuntimeWarning を抑制する
warnings.filterwarnings("ignore", category=RuntimeWarning, module="duckduckgo_search.*")
warnings.filterwarnings("ignore", category=RuntimeWarning)

from duckduckgo_search import DDGS

def main():
    print("AI リサーチパイプラインを開始します...")
    issue_title = os.environ.get("ISSUE_TITLE", "")
    issue_number = os.environ.get("ISSUE_NUMBER", "")
    repo_name = os.environ.get("REPO_NAME", "")
    github_token = os.environ.get("GITHUB_TOKEN", "")

    if not issue_title or not issue_number or not repo_name or not github_token:
        print("必要な環境変数が不足しています。終了します。")
        sys.exit(0)

    print(f"トピックを調査中: {issue_title}")

    # duckduckgo-search を使用
    try:
        results = DDGS().text(issue_title, max_results=5)
        comment_body = "## AI リサーチ結果\n\nIssueのタイトルに基づいて自動的にWeb検索を行いました。\n\n"
        for r in results:
            comment_body += f"- [{r.get('title')}]({r.get('href')})\n"

        print("検索が完了しました。Issueにコメントを追加します。")

        # GitHub APIを使用してコメントを追加
        url = f"https://api.github.com/repos/{repo_name}/issues/{issue_number}/comments"
        headers = {
            "Authorization": f"Bearer {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        data = {
            "body": comment_body
        }

        response = requests.post(url, headers=headers, json=data)
        if response.status_code == 201:
            print("Issueへのコメント追加が成功しました。")
        else:
            print(f"Issueへのコメント追加に失敗しました: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"検索中のエラー: {e}")

    print("AI リサーチパイプラインが正常に完了しました。")

if __name__ == "__main__":
    main()
