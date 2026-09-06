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
    response = requests.get(url, headers=headers)
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
    あなたは優秀なテクニカルライターです。
    以下のマージされたPull Requestの変更差分を元に、ユーザー向けまたは開発者向けのリリースノート（Changelog）のドラフトを作成してください。
    Markdown形式で、日本語で記述してください。

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

        comment_body = f"📝 **Gemini AI 自動ドキュメント作成案**\n\nこのPRの変更に基づいたリリースノート案です。\n\n{response.text}"
        pr.create_issue_comment(comment_body)
        print("ドキュメント案のコメント投稿に成功しました")
    except Exception as e:
        print(f"AIドキュメント生成中にエラーが発生しました: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
