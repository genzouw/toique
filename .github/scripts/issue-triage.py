# /// script
# dependencies = ["google-genai", "requests"]
# ///
import os
import json
import requests
from google import genai
from google.genai import types

def main():
    # イベントパスの取得
    event_path = os.environ.get("GITHUB_EVENT_PATH")
    if not event_path or not os.path.exists(event_path):
        print("GITHUB_EVENT_PATH が設定されていないか、ファイルが見つかりません。")
        return

    # ペイロードの読み込み
    with open(event_path, "r") as f:
        event_data = json.load(f)

    issue = event_data.get("issue")
    if not issue:
        print("イベントに issue データが見つかりません。")
        return

    title = issue.get("title", "")
    body = issue.get("body", "")
    issue_number = issue.get("number")
    repo_name = os.environ.get("GITHUB_REPOSITORY")
    github_token = os.environ.get("GITHUB_TOKEN")
    api_key = os.environ.get("GEMINI_API_KEY")
    search_context = os.environ.get("SEARCH_CONTEXT", "")

    if not github_token or not api_key:
        print("GITHUB_TOKEN または GEMINI_API_KEY が不足しています。")
        return

    client = genai.Client(api_key=api_key)

    prompt = f"""
    以下のGitHub Issueを評価し、適切なトリアージを行ってください。

    タイトル: {title}
    本文: {body}

    関連する検索コンテキスト:
    {search_context}

    以下の2点を出力してください:
    1. 適切なラベル (例: bug, enhancement, documentation, question) をカンマ区切りのリストとして特定する。
    2. 報告者やメンテナに向けて、Issueを要約し次のステップを提案する、役に立つ歓迎のコメントを日本語で作成する。

    出力フォーマット:
    Labels: [label1, label2]
    Comment: [ここに日本語のコメントを記載]
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        output = response.text

        import re

        labels = []
        comment = output

        # 正規表現でラベルとコメントを抽出
        labels_match = re.search(r"Labels:\s*\[(.*?)\]", output)
        if labels_match:
            labels = [l.strip() for l in labels_match.group(1).split(",") if l.strip()]

        comment_match = re.search(r"Comment:\s*(.*)", output, re.DOTALL)
        if comment_match:
            comment = comment_match.group(1).strip()

        # ラベルの追加
        if labels:
            url = f"https://api.github.com/repos/{repo_name}/issues/{issue_number}/labels"
            headers = {
                "Authorization": f"Bearer {github_token}",
                "Accept": "application/vnd.github.v3+json"
            }
            requests.post(url, headers=headers, json={"labels": labels})

        # コメントの追加
        url = f"https://api.github.com/repos/{repo_name}/issues/{issue_number}/comments"
        headers = {
            "Authorization": f"Bearer {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        requests.post(url, headers=headers, json={"body": comment})

        print("トリアージが成功しました。")

    except Exception as e:
        print(f"トリアージ中にエラーが発生しました: {e}")

if __name__ == "__main__":
    main()
