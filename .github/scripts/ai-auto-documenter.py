# /// script
# dependencies = [
#   "requests>=2.31,<3",
# ]
# ///

import os
import sys
import json
import requests

def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print(json.dumps({"source": {"name": "AI Auto Documenter", "url": "https://github.com"}, "diagnostics": []}))
        return

    diff = sys.stdin.read()
    if not diff or len(diff) < 20:
        print(json.dumps({"source": {"name": "AI Auto Documenter", "url": "https://github.com"}, "diagnostics": []}))
        return

    # Gemini APIのエンドポイントを設定（gemini-1.5-proは2025-09-29に提供終了済みのため、
    # 無料枠で利用可能なモデルを既定値としつつ GEMINI_MODEL で上書き可能にする）
    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}

    # AIへのプロンプトを作成
    prompt = """
You are a code reviewer looking for missing documentation (JSDoc, Python docstrings, missing inline comments for complex logic) in this PR diff.
Review the following PR diff and output ANY missing documentation issues you find in EXACTLY this JSON array format (do not output markdown blocks or any other text).
All messages must be in Japanese:
[
  {
    "file": "path/to/file.ts",
    "line": 15,
    "message": "この関数にはJSDocが不足しています。"
  }
]
If there are no issues, output an empty array [].
Diff:
""" + diff

    data = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json"
        }
    }

    try:
        # APIリクエストを送信
        res = requests.post(url, headers=headers, json=data, timeout=30)
        res.raise_for_status()
        resp_json = res.json()
        candidates = resp_json.get("candidates")
        if not candidates:
            # 安全フィルタ等でcandidatesが空になるケースを、defaultで握り潰さず明示的に異常として扱う
            raise ValueError(f"Gemini APIがcandidatesを返しませんでした: {resp_json.get('promptFeedback', resp_json)}")
        text_resp = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "[]")

        # Reviewdogのrdjsonフォーマットに変換
        issues = json.loads(text_resp)
        rdjson_diagnostics = []
        for issue in issues:
            rdjson_diagnostics.append({
                "message": issue.get("message", ""),
                "location": {
                    "path": issue.get("file", ""),
                    "range": {
                        "start": {
                            "line": issue.get("line", 1)
                        }
                    }
                },
                "severity": "INFO"
            })

        rdjson = {
            "source": {
                "name": "AI Auto Documenter",
                "url": "https://github.com"
            },
            "diagnostics": rdjson_diagnostics
        }
        print(json.dumps(rdjson, indent=2))

    except Exception as e:
        print(json.dumps({"source": {"name": "AI Auto Documenter", "url": "https://github.com"}, "diagnostics": []}))
        error_msg = f"{type(e).__name__}: {e}"
        print(f"Error: {error_msg}", file=sys.stderr)
        # rdjsonのdiagnosticsはfilter_mode=addedのため差分行に紐付かないエラーは表示されない。
        # ワークフロー実行結果として必ず確認できるようStep Summaryにも失敗内容を残す。
        summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
        if summary_path:
            with open(summary_path, "a", encoding="utf-8") as f:
                f.write(f"### ⚠️ AI Auto Documenter の実行に失敗しました\n\n```\n{error_msg}\n```\n")

if __name__ == "__main__":
    main()
