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

    # Gemini APIのエンドポイントを設定
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={api_key}"
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
        text_resp = resp_json.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "[]")

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
        print(f"Error: {e}", file=sys.stderr)

if __name__ == "__main__":
    main()
