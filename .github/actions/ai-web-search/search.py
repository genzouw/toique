# /// script
# dependencies = ["exa_py", "tavily-python", "duckduckgo-search", "wikipedia", "arxiv"]
# ///
import sys
import os

def search_duckduckgo(query):
    try:
        from duckduckgo_search import DDGS
        results = DDGS().text(query, max_results=3)
        return "\n".join([f"- [{r.get('title', '')}]({r.get('href', '')}): {r.get('body', '')}" for r in results])
    except Exception as e:
        return f"DuckDuckGo エラー: {e}"

def search_wikipedia(query):
    try:
        import wikipedia
        # 言語を日本語に設定
        wikipedia.set_lang("ja")
        return wikipedia.summary(query, sentences=3)
    except Exception as e:
        return f"Wikipedia エラー: {e}"

def search_arxiv(query):
    try:
        import arxiv
        client = arxiv.Client()
        search = arxiv.Search(query=query, max_results=3, sort_by=arxiv.SortCriterion.Relevance)
        results = []
        for r in client.results(search):
            results.append(f"- [{r.title}]({r.pdf_url}): {r.summary}")
        return "\n".join(results)
    except Exception as e:
        return f"Arxiv エラー: {e}"

def search_tavily(query):
    try:
        from tavily import TavilyClient
        api_key = os.environ.get("TAVILY_API_KEY")
        if not api_key: return "Tavily API キーが見つかりません。"
        client = TavilyClient(api_key=api_key)
        res = client.search(query=query, max_results=3)
        return "\n".join([f"- [{r.get('title', '')}]({r.get('url', '')}): {r.get('content', '')}" for r in res.get('results', [])])
    except Exception as e:
        return f"Tavily エラー: {e}"

def search_exa(query):
    try:
        from exa_py import Exa
        api_key = os.environ.get("EXA_API_KEY")
        if not api_key: return "Exa API キーが見つかりません。"
        exa = Exa(api_key=api_key)
        res = exa.search_and_contents(query, num_results=3)
        return "\n".join([f"- [{r.title}]({r.url}): {r.text[:200]}" for r in res.results])
    except Exception as e:
        return f"Exa エラー: {e}"

if __name__ == "__main__":
    query = os.environ.get("SEARCH_QUERY")
    if not query:
        print("環境変数 SEARCH_QUERY が設定されていません。")
        sys.exit(1)

    print(f"# 検索結果: {query}\n")
    print("## DuckDuckGo\n")
    print(search_duckduckgo(query))
    print("\n## Wikipedia\n")
    print(search_wikipedia(query))
    print("\n## Arxiv\n")
    print(search_arxiv(query))
    print("\n## Tavily\n")
    print(search_tavily(query))
    print("\n## Exa\n")
    print(search_exa(query))
