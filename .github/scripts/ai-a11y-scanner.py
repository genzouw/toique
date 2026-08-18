# /// script
# dependencies = [
#   "requests",
# ]
# ///

import os
import sys
import json
import requests

def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print(json.dumps({"source": {"name": "AI A11y Scanner", "url": "https://github.com"}, "diagnostics": []}))
        return

    diff = sys.stdin.read()
    if not diff or len(diff) < 20:
        print(json.dumps({"source": {"name": "AI A11y Scanner", "url": "https://github.com"}, "diagnostics": []}))
        return

    # Gemini APIのエンドポイントを設定
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}

    # AIへのプロンプトを作成
    prompt = """
You are an accessibility (a11y) expert reviewing frontend code changes (React/HTML/Tailwind).
Review the following PR diff and identify accessibility issues such as:
- Missing `aria-label`, `title`, or `aria-hidden` attributes.
- Improper usage of generic plain text fallbacks for loading states (e.g. `—`) instead of screen-reader-friendly alternatives like `<span className="sr-only">読み込み中</span>`.
- Missing `role="status"` or `aria-live="polite"` for dynamic messages, empty states, or loading indicators.
- Missing required indicators (e.g., `<span aria-hidden="true">*</span>`) inside `<label>` elements for required inputs.
- Missing or incorrect `autoComplete` attributes on forms.

Output ANY accessibility issues you find in EXACTLY this JSON array format (do not output markdown blocks or any other text).
All messages must be in Japanese:
[
  {
    "file": "frontend/src/components/Button.tsx",
    "line": 22,
    "message": "Button に aria-label またはアクセシブルなテキストが含まれていません。"
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
                "severity": "WARNING"
            })

        rdjson = {
            "source": {
                "name": "AI A11y Scanner",
                "url": "https://github.com"
            },
            "diagnostics": rdjson_diagnostics
        }
        print(json.dumps(rdjson, indent=2))

    except Exception as e:
        print(json.dumps({"source": {"name": "AI A11y Scanner", "url": "https://github.com"}, "diagnostics": []}))
        print(f"Error: {e}", file=sys.stderr)

if __name__ == "__main__":
    main()
