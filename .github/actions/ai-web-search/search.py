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
    """DuckDuckGo HTML版のレスポンスから検索結果のURL・タイトル・スニペットを抽出する。

    固定文字列split（属性の出現順序に依存）ではなく、result__a / result__url /
    result__snippet クラスを対象にすることで、ボット検証ページなど構造が異なる
    HTMLに対しても例外を出さず・結果を捏造せずに空リストで済ませる。

    アンカーのテキストが検索結果のタイトルそのものなので、href だけでなくタグ内の
    テキストも収集する。URLの羅列だけではRAGの入力として成立しないため、
    exa_search と同じく url / title / snippet の3点を揃える。
    """

    # 1件の検索結果は result__a（タイトル付きリンク）で始まり、
    # result__url（URL表示用の同一リンク）と result__snippet が続く。
    # タイトル・スニペットは <b> でハイライトされるため、収集中は開始タグを
    # 無視し、収集を始めたタグと同じ終了タグでのみ確定させる。
    def __init__(self):
        super().__init__()
        self.results = []  # [{"url": ..., "title": ..., "snippet": ...}, ...]
        self._kind = None  # "title" / "url" / "snippet"
        self._tag = None
        self._depth = 0
        self._href = None
        self._text = []

    def _start(self, kind, tag, href):
        self._kind, self._tag, self._depth, self._href, self._text = kind, tag, 0, href, []

    def _flush(self):
        text = "".join(self._text).strip()
        if self._kind == "title":
            self.results.append({"url": self._href, "title": text, "snippet": ""})
        elif self._kind == "url" and self.results and not self.results[-1]["url"]:
            self.results[-1]["url"] = self._href
        elif self._kind == "snippet" and self.results and not self.results[-1]["snippet"]:
            self.results[-1]["snippet"] = text
        self._kind = self._tag = self._href = None
        self._text = []

    def handle_starttag(self, tag, attrs):
        if self._kind is not None:
            # 収集中のハイライトタグ等。同名タグのネストだけ深さを数える。
            if tag == self._tag:
                self._depth += 1
            return

        attrs_dict = dict(attrs)
        classes = (attrs_dict.get("class") or "").split()
        href = attrs_dict.get("href")

        if "result__a" in classes and href:
            self._start("title", tag, href)
        elif "result__url" in classes and href:
            self._start("url", tag, href)
        elif "result__snippet" in classes:
            self._start("snippet", tag, None)

    def handle_data(self, data):
        if self._kind is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if self._kind is None or tag != self._tag:
            return
        if self._depth > 0:
            self._depth -= 1
            return
        self._flush()


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
        for item in parser.results:
            link = item["url"]
            if not link:
                continue
            if link.startswith('//duckduckgo.com/l/?uddg='):
                link = urllib.parse.unquote(link.split('uddg=')[1].split('&')[0])
            if link in seen:
                continue
            seen.add(link)
            # タイトルが取れなかった場合のみURLをフォールバックに使う。
            # 取れていない事実を固定文字列で塗り潰さない。
            results.append({
                "url": link,
                "title": item["title"] or link,
                "snippet": item["snippet"],
            })
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
        output = json.dumps(results, indent=2)

    print(output)

if __name__ == "__main__":
    main()
