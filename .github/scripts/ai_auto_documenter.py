# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "httpx",
#     "duckduckgo-search"
# ]
# ///

import os
import sys
import json
import warnings
import httpx
from duckduckgo_search import DDGS

# duckduckgo-search のインポート時に発生する RuntimeWarning を抑制する
warnings.filterwarnings("ignore", category=RuntimeWarning)

def get_web_search_results(query):
    results = []
    try:
        ddgs = DDGS()
        # 最新情報を得るため duckduckgo-search を使用
        for r in ddgs.text(query, max_results=3):
            results.append(f"Title: {r['title']}\\nLink: {r['href']}\\nSnippet: {r['body']}")
    except Exception as e:
        results.append(f"検索エラー: {e}")
    return "\\n\\n".join(results)

def main():
    diff_content = sys.stdin.read()
    if not diff_content.strip():
        print("PR diff is empty or too trivial for documentation generation.")
        return

    # 簡単な検索クエリ（必要に応じて高度なプロンプトで生成可能）
    search_query = "latest web development accessibility best practices 2025"
    web_info = get_web_search_results(search_query)

    prompt = f"""
以下のGitの差分(diff)と、最新のWeb開発(特にアクセシビリティ)に関するWeb検索結果を基に、
ドキュメント(README.mdやCONTRIBUTING.md)に追加・更新すべき内容を提案してください。
提案はGitHubのPRコメントとして投稿しやすいようにMarkdown形式で出力してください。
全て日本語で記載してください。

Web検索結果:
<web_search_results>
{web_info}
</web_search_results>

差分:
<pr_diff>
{diff_content}
</pr_diff>
"""

    url = "http://localhost:11434/api/generate"
    payload = {
        "model": "qwen2.5-coder:0.5b",
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.3
        }
    }

    try:
        response = httpx.post(url, json=payload, timeout=90.0)
        response.raise_for_status()
        data = response.json()

        result = data.get("response", "").strip()
        print(result)

    except Exception as e:
        print(f"ドキュメント自動生成中にエラーが発生しました: {e}")

if __name__ == "__main__":
    main()
