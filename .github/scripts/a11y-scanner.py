# /// script
# dependencies = ["google-genai", "pydantic"]
# ///
import os
import sys
import json
from google import genai
from pydantic import BaseModel, Field

class DiagnosticMessage(BaseModel):
    message: str = Field(description="アクセシビリティの指摘事項（日本語）")
    location: dict = Field(
        description="指摘の場所。'path' (ファイルパス) と 'range' (行番号を含むオブジェクト) を持つ"
    )
    severity: str = Field(description="重要度 (ERROR, WARNING, INFO)")

class DiagnosticsResponse(BaseModel):
    diagnostics: list[DiagnosticMessage] = Field(description="指摘事項のリスト")

def parse_diff(diff_text):
    """
    git diff を解析し、ファイルごとに変更された行の情報を抽出する。
    簡略化のため、追加・変更された行を対象とする。
    """
    files = {}
    current_file = None
    current_line = 0

    for line in diff_text.split('\n'):
        if line.startswith('+++ b/'):
            current_file = line[6:]
            if current_file.startswith('frontend/'):
                files[current_file] = []
            else:
                current_file = None
        elif line.startswith('@@'):
            # @@ -1,3 +1,4 @@
            if current_file:
                parts = line.split(' ')
                if len(parts) >= 3:
                    new_lines = parts[2]
                    start_line = int(new_lines.split(',')[0].strip('+'))
                    current_line = start_line - 1
        elif line.startswith('+') and not line.startswith('+++'):
            if current_file:
                current_line += 1
                files[current_file].append((current_line, line[1:]))
        elif line.startswith(' ') or line.startswith('-'):
            if current_file and not line.startswith('---'):
                if not line.startswith('-'):
                    current_line += 1
    return files

def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY is not set.")
        sys.exit(0)

    diff_text = os.environ.get("PR_DIFF", "")
    if not diff_text:
        print("PR_DIFF is empty.")
        sys.exit(0)

    files_changes = parse_diff(diff_text)
    if not files_changes:
        print("No frontend files changed.")
        sys.exit(0)

    client = genai.Client(api_key=api_key)
    rdjson = {
        "source": {
            "name": "a11y-scanner",
            "url": "https://github.com/genzouw/toique"
        },
        "diagnostics": []
    }

    prompt_template = """
以下のフロントエンドのコード変更 (React/TSX) において、アクセシビリティ (a11y) の問題がないかレビューしてください。
特に以下の点に注意してください。
- 装飾用アイコン (lucide-react など) に aria-hidden="true" が付与されているか
- インタラクティブ要素 (button, a など) に適切な aria-label やテキストがあるか
- 無効化 (disabled) された要素に理由を説明する title や aria-label があるか

変更されたコード:
{code}

出力は指定されたJSONスキーマに従ってください。
指摘事項の location.range.start.line には、対象となるコードの行番号を指定してください。
"""

    for file_path, changes in files_changes.items():
        if not changes:
            continue

        code_context = "\n".join([f"Line {line_num}: {text}" for line_num, text in changes])
        prompt = prompt_template.format(code=code_context)

        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": DiagnosticsResponse
                }
            )

            result = json.loads(response.text)

            for diag in result.get("diagnostics", []):
                # rdjson 形式に変換
                rdjson_diag = {
                    "message": diag.get("message"),
                    "severity": diag.get("severity", "WARNING"),
                    "location": {
                        "path": file_path,
                        "range": {
                            "start": {
                                "line": diag.get("location", {}).get("range", {}).get("start", {}).get("line", 1)
                            }
                        }
                    }
                }
                rdjson["diagnostics"].append(rdjson_diag)

        except Exception as e:
            print(f"Error processing {file_path}: {e}")

    with open("rdjson.json", "w") as f:
        json.dump(rdjson, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    main()
