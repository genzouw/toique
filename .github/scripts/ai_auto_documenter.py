# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "google-genai"
# ]
# ///

import os
import sys
from google import genai
from google.genai import types

def generate_documentation(diff_text: str, title: str, body: str, api_key: str) -> str:
    client = genai.Client(api_key=api_key)

    prompt = f"""
    You are an expert technical writer and software engineer.
    Based on the following PR title, description, and git diff, generate a clear, concise documentation summary for this Pull Request.
    The output should be in Markdown and written in Japanese.
    Include sections for:
    - 💡 概要 (Overview of what changed)
    - 🔧 技術的な詳細 (Technical details of the implementation)
    - ⚠️ 注意点・影響範囲 (Potential impact or things to watch out for)

    Do not include any greeting or conversational filler. Output only the Markdown documentation.

    PR Title: {title}
    PR Body: {body}

    Git Diff:
    {diff_text}
    """

    response = client.models.generate_content(
        model='gemini-1.5-pro',
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.2
        )
    )

    return response.text

def main():
    diff_text = os.environ.get("PR_DIFF", "")
    title = os.environ.get("PR_TITLE", "")
    body = os.environ.get("PR_BODY", "")
    api_key = os.environ.get("GEMINI_API_KEY", "")

    if not api_key:
        print("エラー: GEMINI_API_KEYがありません。", file=sys.stderr)
        sys.exit(0) # ワークフローが失敗しないように正常終了してスキップ

    if not diff_text or len(diff_text.strip()) < 20:
        sys.exit(0)

    try:
        docs = generate_documentation(diff_text, title, body, api_key)
        print(docs)
    except Exception as e:
        print(f"ドキュメント生成エラー: {e}", file=sys.stderr)
        sys.exit(0)

if __name__ == "__main__":
    main()
