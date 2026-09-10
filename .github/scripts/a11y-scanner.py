# /// script
# dependencies = ["google-genai", "requests"]
# ///

import os
import sys
import json
import requests
from google import genai

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
    api_key = os.getenv("GEMINI_API_KEY")
    github_token = os.getenv("GITHUB_TOKEN")
    event_path = os.getenv("GITHUB_EVENT_PATH")

    if not all([api_key, github_token, event_path]):
        print("必須の環境変数が設定されていません", file=sys.stderr)
        sys.exit(1)

    with open(event_path, "r") as f:
        event_data = json.load(f)

    if "pull_request" not in event_data:
        print("プルリクエストイベントではありません", file=sys.stderr)
        sys.exit(0)

    pr = event_data["pull_request"]
    repo = event_data["repository"]["full_name"]
    pr_number = pr["number"]

    diff = get_pr_diff(repo, pr_number, github_token)

    if not diff.strip():
        print(json.dumps({"source": {"name": "AI A11y Scanner", "url": ""}, "diagnostics": []}))
        sys.exit(0)

    client = genai.Client(api_key=api_key)

    prompt = """
    You are an expert web accessibility auditor. Review the following pull request diff for a React frontend.
    Focus strictly on accessibility issues (WCAG 2.2 AA standards), such as:
    - Missing aria-labels or title attributes on interactive elements.
    - Improper use of ARIA roles.
    - Lack of decorative SVG `aria-hidden="true"` inside interactive elements.
    - Invalid contrast or keyboard navigation issues deducible from code.
    - Missing required indicators on forms.

    Return the result strictly as a valid JSON object following the Reviewdog Diagnostic (rdjson) format.
    The response MUST only contain the JSON object and no markdown formatting, no backticks, no explanations.

    Format:
    {
      "source": { "name": "AI A11y Scanner", "url": "" },
      "diagnostics": [
        {
          "message": "Detailed description of the issue in Japanese.",
          "location": {
            "path": "frontend/src/components/MyComponent.tsx",
            "range": { "start": { "line": 42 } }
          },
          "severity": "WARNING"
        }
      ]
    }

    Diff:
    """ + diff

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        result_text = response.text
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]

        result_json = json.loads(result_text.strip())
        print(json.dumps(result_json))

    except Exception as e:
        print(f"AI解析中にエラーが発生しました: {e}", file=sys.stderr)
        # パイプラインを失敗させないため、エラー時は空のrdjsonを出力する
        print(json.dumps({"source": {"name": "AI A11y Scanner", "url": ""}, "diagnostics": []}))

if __name__ == "__main__":
    main()
