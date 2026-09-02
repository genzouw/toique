# /// script
# dependencies = [
#   "google-genai"
# ]
# ///

import os
import sys
import json
from google import genai

def run_review(diff_file):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY is not set.", file=sys.stderr)
        sys.exit(0)

    try:
        with open(diff_file, 'r') as f:
            diff_content = f.read()
    except Exception as e:
        print(f"Error reading diff file: {e}")
        sys.exit(1)

    client = genai.Client(api_key=api_key)

    prompt = f"""
    You are an expert code reviewer. Review the following Git Diff and provide inline comments.
    Identify bugs, security vulnerabilities, performance issues, and suggest improvements.

    Output the response STRICTLY as a JSON object adhering to the Reviewdog Diagnostic (rdjson) format.
    The output MUST NOT contain markdown formatting like ```json ... ```, just the raw JSON text.

    Format:
    {{
      "source": {{
        "name": "gemini-code-review",
        "url": "https://github.com/google/gemini"
      }},
      "diagnostics": [
        {{
          "message": "Detailed review comment here (in Japanese).",
          "location": {{
            "path": "path/to/file.ext",
            "range": {{
              "start": {{
                "line": 10
              }}
            }}
          }},
          "severity": "WARNING"
        }}
      ]
    }}

    Only provide comments for lines that were added or modified in the diff. All comments must be in Japanese.

    Diff:
    <pr_diff>
    {diff_content}
    </pr_diff>
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )

        text_response = response.text.strip()
        if text_response.startswith('```json'):
            text_response = text_response[7:-3]
        elif text_response.startswith('```'):
            text_response = text_response[3:-3]

        # Verify it's valid JSON
        parsed_json = json.loads(text_response.strip())
        print(json.dumps(parsed_json))

    except Exception as e:
        print(f"Error during Gemini API call: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: uv run pr_review_rdjson.py <diff_file>")
        sys.exit(1)

    diff_file = sys.argv[1]
    run_review(diff_file)
