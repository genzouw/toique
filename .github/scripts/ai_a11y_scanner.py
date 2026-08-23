# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "google-genai",
#     "pydantic"
# ]
# ///

import os
import sys
import json
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

class Location(BaseModel):
    path: str
    range: dict

class Diagnostic(BaseModel):
    message: str
    location: Location
    severity: str

class RDJson(BaseModel):
    source: dict
    diagnostics: list[Diagnostic]

def generate_rdjson(diff_text: str, api_key: str) -> str:
    client = genai.Client(api_key=api_key)

    prompt = f"""
    You are an expert in Web Accessibility (a11y) and React.
    Analyze the following git diff and identify any accessibility issues (e.g., missing aria-labels,
    improper role usage, missing alt text, keyboard navigation issues, etc.).

    CRITICAL: You must output ONLY valid JSON in the Reviewdog Diagnostic (rdjson) format.
    Do not include markdown code blocks or any other text.

    RDJson Format example:
    {{
      "source": {{
        "name": "ai-a11y-scanner",
        "url": "https://github.com/reviewdog/reviewdog"
      }},
      "diagnostics": [
        {{
          "message": "Missing aria-label on button.",
          "location": {{
            "path": "frontend/src/components/Button.tsx",
            "range": {{
              "start": {{
                "line": 14,
                "column": 1
              }}
            }}
          }},
          "severity": "WARNING"
        }}
      ]
    }}

    Here is the git diff:
    {diff_text}
    """

    response = client.models.generate_content(
        model='gemini-1.5-pro',
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.1
        )
    )

    return response.text

def main():
    diff_text = os.environ.get("PR_DIFF", "")
    api_key = os.environ.get("GEMINI_API_KEY", "")

    if not api_key:
        print('{"source": {"name": "ai-a11y-scanner"}, "diagnostics": []}')
        sys.exit(0)

    if not diff_text or len(diff_text.strip()) < 20:
        # Trivial diff, output empty rdjson
        print('{"source": {"name": "ai-a11y-scanner"}, "diagnostics": []}')
        sys.exit(0)

    try:
        rdjson_str = generate_rdjson(diff_text, api_key)
        # 確実に有効なJSONとなるようにパースしてから再度ダンプ
        rdjson_obj = json.loads(rdjson_str)
        print(json.dumps(rdjson_obj, indent=2))
    except Exception as e:
        print(f"Gemini処理中のエラー: {e}", file=sys.stderr)
        print('{"source": {"name": "ai-a11y-scanner"}, "diagnostics": []}')

if __name__ == "__main__":
    main()
