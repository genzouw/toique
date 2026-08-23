# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "exa-py",
#     "tavily-python",
#     "duckduckgo-search",
#     "requests",
#     "arxiv"
# ]
# ///

import os
import sys
import json
import urllib.request
import urllib.parse
from typing import List, Dict, Any

def get_jina_reader_content(url: str) -> str:
    """Fetch markdown content of a URL using Jina Reader API."""
    jina_url = f"https://r.jina.ai/{url}"
    try:
        req = urllib.request.Request(jina_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            return response.read().decode('utf-8')
    except Exception as e:
        return f"Error fetching full content: {e}"

def search_duckduckgo(query: str, max_results: int) -> List[Dict[str, str]]:
    from duckduckgo_search import DDGS
    try:
        results = list(DDGS().text(query, max_results=max_results))
        formatted_results = []
        for r in results:
            formatted_results.append({
                "title": r.get("title", ""),
                "url": r.get("href", ""),
                "snippet": r.get("body", "")
            })
        return formatted_results
    except Exception as e:
        print(f"DuckDuckGo search error: {e}", file=sys.stderr)
        return []

def search_exa(query: str, max_results: int) -> List[Dict[str, str]]:
    api_key = os.environ.get("EXA_API_KEY")
    if not api_key:
        print("EXA_API_KEY is missing.", file=sys.stderr)
        return []

    from exa_py import Exa
    exa = Exa(api_key=api_key)
    try:
        response = exa.search_and_contents(query, num_results=max_results, text=True)
        formatted_results = []
        for r in response.results:
            formatted_results.append({
                "title": r.title,
                "url": r.url,
                "snippet": r.text[:500] + "..." if r.text else ""
            })
        return formatted_results
    except Exception as e:
        print(f"Exa search error: {e}", file=sys.stderr)
        return []

def search_tavily(query: str, max_results: int) -> List[Dict[str, str]]:
    api_key = os.environ.get("TAVILY_API_KEY")
    if not api_key:
        print("TAVILY_API_KEY is missing.", file=sys.stderr)
        return []

    from tavily import TavilyClient
    client = TavilyClient(api_key=api_key)
    try:
        response = client.search(query, max_results=max_results)
        formatted_results = []
        for r in response.get("results", []):
            formatted_results.append({
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "snippet": r.get("content", "")
            })
        return formatted_results
    except Exception as e:
        print(f"Tavily search error: {e}", file=sys.stderr)
        return []

def search_wikipedia(query: str, max_results: int) -> List[Dict[str, str]]:
    import requests
    url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(query)}&utf8=&format=json"
    try:
        response = requests.get(url)
        data = response.json()
        results = data.get("query", {}).get("search", [])[:max_results]
        formatted_results = []
        for r in results:
            page_id = r.get("pageid")
            title = r.get("title", "")
            snippet = r.get("snippet", "")
            # HTMLタグの基本的なクリーンアップ
            import re
            snippet = re.sub(r'<[^>]+>', '', snippet)
            formatted_results.append({
                "title": title,
                "url": f"https://en.wikipedia.org/?curid={page_id}",
                "snippet": snippet
            })
        return formatted_results
    except Exception as e:
        print(f"Wikipedia search error: {e}", file=sys.stderr)
        return []

def search_arxiv(query: str, max_results: int) -> List[Dict[str, str]]:
    import arxiv
    try:
        client = arxiv.Client()
        search = arxiv.Search(
            query=query,
            max_results=max_results,
            sort_by=arxiv.SortCriterion.Relevance
        )
        formatted_results = []
        for r in client.results(search):
            formatted_results.append({
                "title": r.title,
                "url": r.entry_id,
                "snippet": r.summary
            })
        return formatted_results
    except Exception as e:
        print(f"Arxiv search error: {e}", file=sys.stderr)
        return []


def main():
    query = os.environ.get("SEARCH_QUERY", "")
    provider = os.environ.get("SEARCH_PROVIDER", "duckduckgo").lower()
    max_results = int(os.environ.get("MAX_RESULTS", "5"))

    if not query:
        print("エラー: SEARCH_QUERY環境変数が必要です。")
        sys.exit(1)

    print(f"'{query}' を {provider} で検索しています...", file=sys.stderr)

    results = []
    if provider == "exa":
        results = search_exa(query, max_results)
    elif provider == "tavily":
        results = search_tavily(query, max_results)
    elif provider == "duckduckgo":
        results = search_duckduckgo(query, max_results)
    elif provider == "wikipedia":
        results = search_wikipedia(query, max_results)
    elif provider == "arxiv":
        results = search_arxiv(query, max_results)
    else:
        print(f"サポートされていないプロバイダ: {provider}。DuckDuckGoにフォールバックします。", file=sys.stderr)
        results = search_duckduckgo(query, max_results)

    output_md = f"# '{query}' の検索結果 ({provider})\n\n"

    for i, res in enumerate(results):
        title = res.get("title", "No Title")
        url = res.get("url", "")
        snippet = res.get("snippet", "No Snippet")

        output_md += f"## {i+1}. [{title}]({url})\n"
        output_md += f"**スニペット:** {snippet}\n\n"

        # 時間/APIコールの節約のため、最初の2つの結果のみJinaのフルコンテンツを取得
        if url and i < 2 and not provider == "arxiv":
            output_md += f"<details><summary>フルコンテンツ (Jina Reader経由)</summary>\n\n"
            full_content = get_jina_reader_content(url)
            output_md += f"{full_content[:2000]}...\n" # 長さを制限
            output_md += f"\n</details>\n\n"

    # GITHUB_OUTPUTへの書き込み
    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output:
        with open(github_output, "a") as f:
            # Bashの複数行文字列
            delimiter = "EOF_SEARCH_RESULTS"
            f.write(f"results<<{delimiter}\n")
            f.write(output_md)
            f.write(f"\n{delimiter}\n")
    else:
        print(output_md)

if __name__ == "__main__":
    main()
