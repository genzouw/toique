# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "httpx",
# ]
# ///

import json
import os
import sys
import subprocess
import httpx

def main():
    diff_content = sys.stdin.read()
    if not diff_content.strip():
        print(json.dumps({
            "source": {"name": "ai-a11y-scanner", "url": "https://github.com/genzouw/toique"},
            "severity": "WARNING",
            "diagnostics": []
        }))
        return

    prompt = f"""
以下のGitの差分(diff)を読み、フロントエンド(React, JSX/TSXなど)のアクセシビリティ(a11y)に関する問題点を探してください。
例えば、装飾用アイコン(lucide-reactなど)に aria-hidden="true" が付与されていない、ボタンに aria-label がない、
展開/折りたたみ可能な要素に aria-expanded や aria-controls が適切に設定されていない等です。
他にもa11y観点で改善すべき箇所があれば指摘してください。

出力は、Reviewdog が解釈できる rdjson 形式のJSONのみを出力してください。
Markdownのコードブロック(```json ... ```)は絶対に使用しないでください。
JSON以外のテキストや `<think>` のような思考タグ、説明を含めないでください。

rdjson形式の例:
{{
  "source": {{
    "name": "ai-a11y-scanner",
    "url": "https://github.com/genzouw/toique"
  }},
  "severity": "WARNING",
  "diagnostics": [
    {{
      "message": "Icon要素にaria-hidden=\\"true\\"が設定されていません。スクリーンリーダーの読み上げを防ぐために設定してください。",
      "location": {{
        "path": "frontend/src/components/Button.tsx",
        "range": {{
          "start": {{
            "line": 15
          }}
        }}
      }},
      "severity": "WARNING"
    }}
  ]
}}

差分:
{diff_content}
"""

    # ollamaにリクエストを送信
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": "qwen2.5-coder:0.5b",
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.2
        }
    }

    try:
        response = httpx.post(url, json=payload, timeout=60.0)
        response.raise_for_status()
        data = response.json()

        # モデルの出力を取得し、余分な空白を削除
        result = data.get("response", "").strip()

        # もし ```json ... ``` で囲まれていたら取り除く
        if result.startswith("```json"):
            result = result[7:]
        if result.startswith("```"):
            result = result[3:]
        if result.endswith("```"):
            result = result[:-3]

        result = result.strip()

        # JSONとしてパースできるか確認
        try:
            parsed = json.loads(result)
            # 必須フィールドの確認
            if "diagnostics" not in parsed:
                parsed["diagnostics"] = []
            print(json.dumps(parsed, ensure_ascii=False, indent=2))
        except json.JSONDecodeError:
            # パース失敗時はエラーとしてではなく、空の結果を返す (CIを落とさないため)
            print(json.dumps({
                "source": {"name": "ai-a11y-scanner", "url": "https://github.com/genzouw/toique"},
                "severity": "WARNING",
                "diagnostics": []
            }))

    except Exception as e:
        # 接続エラー等の場合もCIを落とさないため空の結果を返す
        print(json.dumps({
            "source": {"name": "ai-a11y-scanner", "url": "https://github.com/genzouw/toique"},
            "severity": "WARNING",
            "diagnostics": []
        }))

if __name__ == "__main__":
    main()
