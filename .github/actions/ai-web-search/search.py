# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "exa-py",
#   "tavily-python",
#   "duckduckgo-search",
#   "wikipedia",
#   "arxiv",
#   "requests",
# ]
# ///

import os
import uuid
import requests
from xml.sax.saxutils import escape

# GitHub Actionsの出力用ヘルパー関数
def set_output(name, value):
    # 呼び出しごとに一意な区切り文字を生成し、出力内容に単独行のEOFが
    # 含まれていても複数行出力が途中で終端されないようにする
    delimiter = f"gha_{uuid.uuid4().hex}"
    with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
        # 複数行の出力をサポートするための形式
        f.write(f"{name}<<{delimiter}\n{value}\n{delimiter}\n")

def fetch_jina_reader(url):
    try:
        response = requests.get(f"https://r.jina.ai/{url}", timeout=10)
        response.raise_for_status()
        return response.text
    except Exception as e:
        return f"Failed to fetch content from {url}: {str(e)}"

def format_xml(results):
    xml = "<search_results>\n"
    for idx, res in enumerate(results):
        xml += f"  <result index=\"{idx+1}\">\n"
        xml += f"    <title>{escape(res.get('title', 'No title'))}</title>\n"
        xml += f"    <url>{escape(res.get('url', 'No URL'))}</url>\n"
        xml += f"    <snippet>{escape(res.get('snippet', 'No snippet'))}</snippet>\n"

        # フルコンテンツがある場合は含める
        if 'content' in res:
             xml += f"    <content>\n{escape(res['content'])}\n    </content>\n"

        xml += "  </result>\n"
    xml += "</search_results>"
    return xml

def search_duckduckgo(query):
    from duckduckgo_search import DDGS
    results = []
    with DDGS() as ddgs:
        # DDG検索を実行
        for r in ddgs.text(query, max_results=3):
            # Jina Reader経由でフルコンテンツを取得
            content = fetch_jina_reader(r['href'])
            results.append({
                'title': r['title'],
                'url': r['href'],
                'snippet': r['body'],
                'content': content
            })
    return results

def search_tavily(query):
    from tavily import TavilyClient
    api_key = os.environ.get('TAVILY_API_KEY')
    if not api_key:
        return search_duckduckgo(query) # フォールバック

    tavily_client = TavilyClient(api_key=api_key)
    response = tavily_client.search(query=query, search_depth="advanced", max_results=3, include_raw_content=True)
    results = []
    for r in response.get('results', []):
        results.append({
            'title': r.get('title'),
            'url': r.get('url'),
            'snippet': r.get('content'),
            'content': r['raw_content'] if r.get('raw_content') else fetch_jina_reader(r.get('url'))
        })
    return results

def search_exa(query):
    from exa_py import Exa
    api_key = os.environ.get('EXA_API_KEY')
    if not api_key:
        return search_duckduckgo(query) # Fallback

    exa = Exa(api_key=api_key)
    response = exa.search_and_contents(query, num_results=3, text=True)
    results = []
    for r in response.results:
        results.append({
            'title': r.title,
            'url': r.url,
            'snippet': r.text[:500] if r.text else "No content",
            'content': r.text
        })
    return results

def search_wikipedia(query):
    import wikipedia
    results = []
    try:
        search_results = wikipedia.search(query, results=3)
        for title in search_results:
            page = wikipedia.page(title)
            results.append({
                'title': page.title,
                'url': page.url,
                'snippet': page.summary[:500] + "...",
                'content': page.content
            })
    except Exception as e:
         results.append({'title': 'Error', 'snippet': str(e)})
    return results

def search_arxiv(query):
    import arxiv
    results = []
    client = arxiv.Client()
    search = arxiv.Search(
      query = query,
      max_results = 3,
      sort_by = arxiv.SortCriterion.Relevance
    )
    for paper in client.results(search):
        results.append({
            'title': paper.title,
            'url': paper.entry_id,
            'snippet': paper.summary,
            'content': paper.summary # Arxivは基本的なAPIで簡単にフルテキストを提供しないためサマリを使用
        })
    return results

def main():
    query = os.environ.get('QUERY')
    provider = os.environ.get('PROVIDER', 'duckduckgo').lower()

    if not query:
        set_output('results', '<error>No query provided.</error>')
        return

    try:
        if provider == 'tavily':
            results = search_tavily(query)
        elif provider == 'exa':
            results = search_exa(query)
        elif provider == 'wikipedia':
            results = search_wikipedia(query)
        elif provider == 'arxiv':
            results = search_arxiv(query)
        else:
            results = search_duckduckgo(query)

        xml_output = format_xml(results)
        set_output('results', xml_output)
    except Exception as e:
        set_output('results', f'<error>{escape(str(e))}</error>')

if __name__ == "__main__":
    main()
