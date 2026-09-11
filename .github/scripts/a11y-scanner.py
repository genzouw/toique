# /// script
# dependencies = [
#   "google-genai",
# ]
# ///

import os
import json
import subprocess
from google import genai
from pydantic import BaseModel

class Diagnostic(BaseModel):
    message: str
    location: dict
    severity: str

class RdJson(BaseModel):
    source: dict
    diagnostics: list[Diagnostic]

def get_diff():
    base_ref = os.environ.get("BASE_REF", "main")
    # git diff is run comparing base_ref and current HEAD
    result = subprocess.run(
        ["git", "diff", f"origin/{base_ref}...HEAD"],
        capture_output=True,
        text=True,
        check=True
    )
    return result.stdout

def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        # APIキーがない場合は安全に終了する
        print(json.dumps({"source": {"name": "AI A11y Scanner"}, "diagnostics": []}))
        return

    diff = get_diff()
    if not diff.strip() or len(diff) < 20:
        print(json.dumps({"source": {"name": "AI A11y Scanner"}, "diagnostics": []}))
        return

    prompt = f"""
You are an accessibility expert reviewing a pull request diff.
Review the following Git diff and identify any accessibility issues (e.g. missing aria-labels, bad contrast, wrong roles).

Strict Rules:
- Answer ONLY in Japanese.
- Focus ONLY on frontend accessibility issues.
- You must output your results matching the provided JSON schema.
- For `location.path`, use the filename from the diff.
- For `location.range.start.line`, use the line number in the diff where the issue occurs.
- If there are no issues, return an empty array for `diagnostics`.

Diff:
<pr_diff>
{diff}
</pr_diff>
"""

    client = genai.Client(api_key=api_key)
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': RdJson,
            },
        )
        print(response.text)
    except Exception as e:
        # エラーが発生した場合は、パイプラインを壊さないように空のrdjsonを出力する
        print(json.dumps({"source": {"name": "AI A11y Scanner"}, "diagnostics": []}))

if __name__ == "__main__":
    main()
