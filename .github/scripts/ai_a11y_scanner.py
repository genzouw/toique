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
import traceback
from google import genai
from google.genai import types
from pydantic import BaseModel

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

EMPTY_RDJSON = '{"source": {"name": "ai-a11y-scanner"}, "diagnostics": []}'

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
        model='gemini-2.5-flash',
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
        print(EMPTY_RDJSON)
        sys.exit(0)

    if not diff_text or len(diff_text.strip()) < 20:
        # Trivial diff, output empty rdjson
        print(EMPTY_RDJSON)
        sys.exit(0)

    try:
        rdjson_str = generate_rdjson(diff_text, api_key)
        # json.loadsはJSON構文のみを検証するため、reviewdogが要求する型（diagnosticsの
        # 構造など）まではRDJsonモデルで検証してから出力する
        rdjson_obj = json.loads(rdjson_str)
        RDJson.model_validate(rdjson_obj)
        print(json.dumps(rdjson_obj, indent=2))
    except Exception:
        # AIレビューはベストエフォートのため、失敗時はスタックトレースを記録した
        # うえで空のrdjsonにフォールバックしてCIを止めない
        traceback.print_exc(file=sys.stderr)
        print(EMPTY_RDJSON)

if __name__ == "__main__":
    main()
