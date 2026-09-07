# /// script
# dependencies = ["google-genai", "requests"]
# ///
import os
import sys
import json
import requests
from google import genai

def main():
    # イベントパスの取得
    event_path = os.environ.get("GITHUB_EVENT_PATH")
    diff_path = os.environ.get("PR_DIFF_PATH")

    if not event_path or not os.path.exists(event_path):
        print("GITHUB_EVENT_PATH が設定されていないか、ファイルが見つかりません。")
        return

    if not diff_path or not os.path.exists(diff_path):
        print("PR_DIFF_PATH が設定されていないか、ファイルが見つかりません。")
        return

    # ペイロードの読み込み
    with open(event_path, "r") as f:
        event_data = json.load(f)

    # 差分の読み込み
    with open(diff_path, "r") as f:
        pr_diff = f.read()

    pr = event_data.get("pull_request")
    if not pr:
        print("イベントに pull_request データが見つかりません。")
        return

    title = pr.get("title", "")
    body = pr.get("body", "")
    pr_number = pr.get("number")
    repo_name = os.environ.get("GITHUB_REPOSITORY")
    github_token = os.environ.get("GITHUB_TOKEN")
    api_key = os.environ.get("GEMINI_API_KEY")

    if not github_token or not api_key:
        print("GITHUB_TOKEN または GEMINI_API_KEY が不足しています。")
        return

    client = genai.Client(api_key=api_key)

    prompt = f"""
    以下のPull Requestの差分(diff)および情報を基に、PRの概要(サマリー)とドキュメントを日本語で作成してください。

    タイトル: {title}
    本文: {body}

    PRの差分:
    <pr_diff>
    {pr_diff}
    </pr_diff>

    出力フォーマット:
    このPRについてのドキュメントまたは要約コメントを日本語で記述してください。簡潔かつ分かりやすく、開発者が変更内容をすぐに理解できるようにしてください。
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        output = response.text

        comment_body = f"## 🤖 AI Auto Documenter\n\n{output.strip()}"

        # コメントの追加
        url = f"https://api.github.com/repos/{repo_name}/issues/{pr_number}/comments"
        headers = {
            "Authorization": f"Bearer {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        response = requests.post(url, headers=headers, json={"body": comment_body}, timeout=30)
        response.raise_for_status()

        print("自動ドキュメント生成が成功しました。")

    except requests.exceptions.RequestException as e:
        print(f"GitHub API呼び出しに失敗しました: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"ドキュメント生成中にエラーが発生しました: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
