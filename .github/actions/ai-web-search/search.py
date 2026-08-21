# /// script
# dependencies = [
#   "requests>=2.31,<3",
#   "exa-py>=1,<3",
# ]
# ///

import os
import sys
import json
import urllib.parse
import requests
from exa_py import Exa
from html.parser import HTMLParser


class _DuckDuckGoResultParser(HTMLParser):
    """DuckDuckGo HTML版のレスポンスから検索結果リンクを構造的に抽出する。

    固定文字列split（属性の出現順序に依存）ではなく、result__a / result__url
    クラスを持つ <a> タグのhref属性を対象にすることで、ボット検証ページなど
    構造が異なるHTMLに対しても例外を出さず・結果を捏造せずに空リストで済ませる。
    """

    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag != "a":
            return
        attrs_dict = dict(attrs)
        href = attrs_dict.get("href")
        if not href:
            return
        classes = (attrs_dict.get("class") or "").split()
        if "result__a" in classes or "result__url" in classes:
            self.links.append(href)


def duckduckgo_search(query, max_results):
    url = "https://html.duckduckgo.com/html/"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    data = {"q": query}
    try:
        res = requests.post(url, headers=headers, data=data, timeout=10)
        res.raise_for_status()
        parser = _DuckDuckGoResultParser()
        parser.feed(res.text)

        results = []
        seen = set()
        for link in parser.links:
            if link.startswith('//duckduckgo.com/l/?uddg='):
                link = urllib.parse.unquote(link.split('uddg=')[1].split('&')[0])
            if link in seen:
                continue
            seen.add(link)
            results.append({"url": link, "title": "DuckDuckGo Result", "snippet": "Snippet not available"})
            if len(results) >= max_results:
                break
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
    try:
        max_results = int(os.environ.get("MAX_RESULTS", "5"))
    except ValueError:
        max_results = 5
    if max_results < 1:
        max_results = 5
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
    # GITHUB_OUTPUTは1ジョブあたり1MBの上限があるため、full_textおよび
    # シリアライズ後のJSON全体を上限未満に収める
    MAX_FULL_TEXT_CHARS = 200_000
    MAX_OUTPUT_BYTES = 900_000
    if use_jina and results:
        top_url = results[0].get("url")
        if top_url:
            full_text = fetch_jina(top_url)
            if full_text:
                results[0]["full_text"] = full_text[:MAX_FULL_TEXT_CHARS]

    output = json.dumps(results, indent=2)
    while len(output.encode("utf-8")) > MAX_OUTPUT_BYTES and results and "full_text" in results[0]:
        # それでも上限を超える場合はfull_textを段階的に切り詰める
        results[0]["full_text"] = results[0]["full_text"][: len(results[0]["full_text"]) // 2]
        if not results[0]["full_text"]:
            del results[0]["full_text"]
            break
        output = json.dumps(results, indent=2)

    print(output)

if __name__ == "__main__":
    main()
