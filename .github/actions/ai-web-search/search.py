# /// script
# dependencies = [
#   "requests",
#   "exa-py"
# ]
# ///

import os
import sys
import json
import requests
from exa_py import Exa

def duckduckgo_search(query, max_results):
    url = "https://html.duckduckgo.com/html/"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    data = {"q": query}
    try:
        res = requests.post(url, headers=headers, data=data, timeout=10)
        res.raise_for_status()
        # 依存関係を最小限に抑えるため、bs4を使用せずに基本的なパースを実行
        content = res.text
        results = []
        parts = content.split('class="result__url" href="')
        for part in parts[1:max_results+1]:
            link = part.split('"')[0]
            if link.startswith('//duckduckgo.com/l/?uddg='):
                import urllib.parse
                link = urllib.parse.unquote(link.split('uddg=')[1].split('&')[0])
            results.append({"url": link, "title": "DuckDuckGo Result", "snippet": "Snippet not available"})
        return results
    except Exception as e:
        print(f"DuckDuckGo error: {e}", file=sys.stderr)
        return []

def exa_search(query, max_results, api_key):
    try:
        exa = Exa(api_key)
        res = exa.search_and_contents(query, num_results=max_results, use_autoprompt=True)
        return [{"url": r.url, "title": r.title, "snippet": r.text[:200] if r.text else ""} for r in res.results]
    except Exception as e:
        print(f"Exa error: {e}", file=sys.stderr)
        return []

def tavily_search(query, max_results, api_key):
    try:
        url = "https://api.tavily.com/search"
        data = {
            "api_key": api_key,
            "query": query,
            "max_results": max_results,
            "include_answer": False
        }
        res = requests.post(url, json=data, timeout=10)
        res.raise_for_status()
        return res.json().get("results", [])
    except Exception as e:
        print(f"Tavily error: {e}", file=sys.stderr)
        return []

def fetch_jina(url):
    try:
        jina_url = f"https://r.jina.ai/{url}"
        res = requests.get(jina_url, timeout=15)
        res.raise_for_status()
        return res.text
    except Exception as e:
        print(f"Jina error for {url}: {e}", file=sys.stderr)
        return None

def main():
    query = os.environ.get("QUERY", "")
    max_results = int(os.environ.get("MAX_RESULTS", "5"))
    exa_key = os.environ.get("EXA_API_KEY", "")
    tavily_key = os.environ.get("TAVILY_API_KEY", "")
    use_jina = os.environ.get("USE_JINA", "false").lower() == "true"

    if not query:
        print(json.dumps([]))
        return

    results = []
    # 設定されたAPIキーに基づいて検索プロバイダーを選択
    if exa_key:
        results = exa_search(query, max_results, exa_key)
    elif tavily_key:
        results = tavily_search(query, max_results, tavily_key)
    else:
        results = duckduckgo_search(query, max_results)

    # Jina Readerを使用してフルテキストを取得するオプション
    if use_jina and results:
        top_url = results[0].get("url")
        if top_url:
            full_text = fetch_jina(top_url)
            if full_text:
                results[0]["full_text"] = full_text

    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    main()
