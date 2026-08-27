# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "google-genai",
#   "pydantic"
# ]
# ///

import sys
import os
import json
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

class ReviewComment(BaseModel):
    file: str = Field(description="The path of the file to comment on.")
    line: int = Field(description="The line number in the new file to comment on.")
    message: str = Field(description="The review comment message in Japanese. Must explain the issue and suggest an improvement.")

class ReviewResult(BaseModel):
    comments: list[ReviewComment] = Field(description="List of review comments.")

def generate_rdjson(comments: list[ReviewComment]):
    diagnostics = []
    for c in comments:
        diagnostics.append({
            "message": c.message,
            "location": {
                "path": c.file,
                "range": {
                    "start": {
                        "line": c.line
                    }
                }
            },
            "severity": "WARNING"
        })

    rdjson = {
        "source": {
            "name": "Gemini PR Review",
            "url": "https://github.com/google/gemini"
        },
        "diagnostics": diagnostics
    }
    return json.dumps(rdjson, ensure_ascii=False)

def main():
    if len(sys.argv) < 2:
        print("Usage: python ai_pr_review.py <diff_file>", file=sys.stderr)
        sys.exit(1)

    diff_file = sys.argv[1]

    try:
        with open(diff_file, 'r', encoding='utf-8') as f:
            diff_content = f.read()
    except Exception as e:
        print(f"Error reading diff file: {e}", file=sys.stderr)
        sys.exit(1)

    if not diff_content.strip():
        # diffが空の場合は空のrdjsonを返す
        print(generate_rdjson([]))
        sys.exit(0)

    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set.", file=sys.stderr)
        # コミュニティのPRなどでキーが欠落している場合にパイプラインを失敗させないよう空のrdjsonを出力
        print(generate_rdjson([]))
        sys.exit(0)

    client = genai.Client(api_key=api_key)

    prompt = f"""
あなたは熟練のソフトウェアエンジニアです。以下のPull Requestの差分(diff形式)をレビューし、
潜在的なバグ、パフォーマンスの問題、セキュリティの脆弱性、またはコードの品質向上のための提案を行ってください。
コメントは必ず日本語で出力してください。
些細なスタイル上の問題（スペースの数など）は無視し、重要な問題に絞ってください。

<pr_diff>
{diff_content}
</pr_diff>

以下のJSONスキーマに従って出力してください。
"""
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ReviewResult,
            ),
        )

        result_json = json.loads(response.text)
        comments = [ReviewComment(**c) for c in result_json.get("comments", [])]

        rdjson_output = generate_rdjson(comments)
        print(rdjson_output)

    except Exception as e:
        print(f"Error calling Gemini API: {e}", file=sys.stderr)
        # エラー時は空のrdjsonを返す
        print(generate_rdjson([]))
        sys.exit(0)

if __name__ == "__main__":
    main()
