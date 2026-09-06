# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "google-genai",
#     "PyGithub"
# ]
# ///

import os
import sys
from google import genai
from google.genai import types
from github import Github

def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    github_token = os.environ.get("GITHUB_TOKEN")
    issue_number = os.environ.get("ISSUE_NUMBER")
    repo_name = os.environ.get("GITHUB_REPOSITORY")
    issue_body = os.environ.get("ISSUE_BODY", "")
    issue_title = os.environ.get("ISSUE_TITLE", "")

    if not all([api_key, github_token, issue_number, repo_name]):
        print("必要な環境変数が不足しています")
        sys.exit(1)

    client = genai.Client(api_key=api_key)

    prompt = f"""
    以下のGitHub Issueを分析し、適切なラベルを提案し、問題の要約と対応の優先度を日本語で記述してください。

    タイトル: {issue_title}
    本文: {issue_body}

    出力フォーマット:
    【推奨ラベル】: カンマ区切りで (例: bug, enhancement, question)
    【優先度】: 高/中/低
    【要約】: (数行の要約)
    【対応方針の提案】: (どう対応すべきかのアドバイス)
    """

    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,
        )
    )

    g = Github(github_token)
    repo = g.get_repo(repo_name)
    issue = repo.get_issue(number=int(issue_number))

    comment_body = f"🤖 **Gemini AI による自動トリアージ**\n\n{response.text}"
    issue.create_comment(comment_body)
    print("Issueのトリアージに成功しました")

if __name__ == "__main__":
    main()
