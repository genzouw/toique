# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "google-genai",
#   "pydantic"
# ]
# ///

import sys
import os
import re
import json
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

# 既知の秘匿情報パターン（APIキー・トークン・秘密鍵・パスワード代入など）を
# マスクするための正規表現。完全なサニタイズを保証するものではないが、
# 無料枠APIへ機密情報が誤って送信されるリスクを実用的な範囲で低減する。
SECRET_PATTERNS = [
    # -----BEGIN ... PRIVATE KEY----- ブロック全体
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----", re.DOTALL),
    # AWS Access Key ID
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    # GitHub Personal Access Token
    re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36,}\b"),
    # Slack Token
    re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b"),
    # JWT (header.payload.signature)
    re.compile(r"\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b"),
    # api_key / secret / token / password などの代入
    re.compile(
        r"(?i)\b(api[_-]?key|secret|token|password|passwd|pwd)\b\s*[:=]\s*['\"]?[A-Za-z0-9\-_./+=]{8,}['\"]?"
    ),
]

def sanitize_diff_content(diff_content: str) -> str:
    sanitized = diff_content
    for pattern in SECRET_PATTERNS:
        sanitized = pattern.sub("[REDACTED]", sanitized)
    return sanitized

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

    # 無料枠のGemini APIには入力・出力がGoogleの製品改善に利用され得るため、
    # 送信前に既知の秘匿情報パターンをマスクする
    diff_content = sanitize_diff_content(diff_content)

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
