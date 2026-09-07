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
    以下のフロントエンドのPull Requestの差分(diff)を評価し、アクセシビリティ(a11y)の観点から問題点や改善提案を日本語で作成してください。

    特に以下の点に注意してレビューしてください：
    - 装飾的・説明的なSVGアイコン（例: lucide-react コンポーネント）など、インタラクティブな要素の中にあるアイコンに対して、スクリーンリーダーの冗長な読み上げを防ぐため `aria-hidden="true"` が明示的に設定されているか。
    - ボタンなどのアクション要素に適切な `aria-label` または視覚的なテキストが存在するか。
    - フォームの必須入力フィールドに視覚的な必須インジケーター（例: `<span className="text-red-500 ml-1" aria-hidden="true">*</span>`）が含まれているか。
    - role="tablist" を使用する場合、キーボードナビゲーション（roving tabIndex など）が考慮されているか。

    タイトル: {title}
    本文: {body}

    PRの差分:
    <pr_diff>
    {pr_diff}
    </pr_diff>

    出力フォーマット:
    アクセシビリティの観点でのみコメントしてください。改善点がない場合は「特にアクセシビリティ上の懸念事項は見当たりませんでした。」と簡潔に出力してください。
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        output = response.text

        # 改善点がない場合など、出力が短い場合はコメントしない、等の制御も可能ですが
        # 今回はそのまま出力します
        comment_body = f"## ♿ AI A11y Scanner\n\n{output.strip()}"

        # コメントの追加
        url = f"https://api.github.com/repos/{repo_name}/issues/{pr_number}/comments"
        headers = {
            "Authorization": f"Bearer {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        response = requests.post(url, headers=headers, json={"body": comment_body}, timeout=30)
        response.raise_for_status()

        print("a11yスキャンが成功しました。")

    except requests.exceptions.RequestException as e:
        print(f"GitHub API呼び出しに失敗しました: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"a11yスキャン中にエラーが発生しました: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
