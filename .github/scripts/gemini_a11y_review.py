# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "google-genai",
#     "PyGithub",
#     "requests"
# ]
# ///

import os
import sys
import requests
from google import genai
from google.genai import types
from github import Github

def get_pr_diff(repo, pr_number, token):
    url = f"https://api.github.com/repos/{repo}/pulls/{pr_number}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3.diff"
    }
    response = requests.get(url, headers=headers, timeout=(10, 30))
    response.raise_for_status()
    return response.text

def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    github_token = os.environ.get("GITHUB_TOKEN")
    pr_number = os.environ.get("PR_NUMBER")
    repo_name = os.environ.get("GITHUB_REPOSITORY")

    if not all([api_key, github_token, pr_number, repo_name]):
        print("必要な環境変数が不足しています")
        sys.exit(1)

    diff = get_pr_diff(repo_name, pr_number, github_token)

    if not diff or len(diff.strip()) < 10:
         print("差分が微小または空のため、スキップします")
         sys.exit(0)

    client = genai.Client(api_key=api_key)

    prompt = f"""
    あなたは優秀なフロントエンド・アクセシビリティの専門家です。
    以下のPull Requestの変更差分(React/TypeScriptコード)を分析し、
    UIコンポーネントにおけるアクセシビリティの問題点や改善提案を日本語で記述してください。
    (例: aria-labelの不足、コントラスト比の懸念、装飾用アイコンへのaria-hiddenの付与、キーボードナビゲーションの不備など)

    問題がなければ「アクセシビリティに関する懸念事項は見当たりませんでした。」と返してください。

    変更差分:
    ```diff
    {diff}
    ```
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.1)
        )

        g = Github(github_token)
        repo = g.get_repo(repo_name)
        pr = repo.get_pull(int(pr_number))

        comment_body = f"🎨 **Gemini UI & アクセシビリティ・レビュー**\n\n{response.text}"
        pr.create_issue_comment(comment_body)
        print("アクセシビリティ・レビューのコメント投稿に成功しました")
    except Exception as e:
        print(f"AIレビュー中にエラーが発生しました: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
