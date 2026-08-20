# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "exa_py",
#     "arxiv",
#     "urllib3",
# ]
# ///

import os
import sys
import json
import urllib.request
import urllib.parse
import arxiv
from exa_py import Exa

def main():
    query = os.environ.get("QUERY", "")
    exa_key = os.environ.get("EXA_API_KEY", "")
    tavily_key = os.environ.get("TAVILY_API_KEY", "")

    if not query:
        print("クエリが提供されていません。")
        sys.exit(0)

    results = []

    # 1. Exa検索（キーが提供されている場合）
    if exa_key:
        try:
            exa = Exa(exa_key)
            res = exa.search_and_contents(query, num_results=2, use_autoprompt=True)
            results.append("## Exa 検索結果:\n")
            for r in res.results:
                results.append(f"### {r.title}\nURL: {r.url}\n\n{r.text[:500]}...\n")
        except Exception as e:
            results.append(f"Exa検索に失敗しました: {e}\n")

    # 2. Tavily検索（キーが提供されている場合、単純なRESTリクエストを使用）
    if tavily_key:
        try:
            req = urllib.request.Request(
                "https://api.tavily.com/search",
                data=json.dumps({"api_key": tavily_key, "query": query, "search_depth": "basic"}).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req) as response:
                tavily_data = json.loads(response.read().decode())
                results.append("## Tavily 検索結果:\n")
                for r in tavily_data.get("results", [])[:2]:
                    results.append(f"### {r.get('title')}\nURL: {r.get('url')}\n\n{r.get('content')}\n")
        except Exception as e:
            results.append(f"Tavily検索に失敗しました: {e}\n")

    # 3. Arxiv検索
    try:
        client = arxiv.Client()
        search = arxiv.Search(
            query=query,
            max_results=2,
            sort_by=arxiv.SortCriterion.Relevance
        )
        arxiv_results = list(client.results(search))
        if arxiv_results:
            results.append("## Arxiv 検索結果:\n")
            for r in arxiv_results:
                results.append(f"### {r.title}\nURL: {r.entry_id}\n\n{r.summary[:500]}...\n")
    except Exception as e:
        results.append(f"Arxiv検索に失敗しました: {e}\n")

    output_text = "\n".join(results)

    # GitHub Outputへの書き込み
    if "GITHUB_OUTPUT" in os.environ:
        with open(os.environ["GITHUB_OUTPUT"], "a") as f:
            # 複数行の出力フォーマット
            f.write("results<<EOF\n")
            f.write(output_text)
            f.write("\nEOF\n")
    else:
        print(output_text)

if __name__ == "__main__":
    main()
