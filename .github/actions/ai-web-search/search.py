# /// script
# dependencies = [
#   "exa_py",
#   "tavily-python",
#   "duckduckgo-search",
#   "wikipedia",
#   "arxiv",
#   "requests",
# ]
# ///
import os
import requests
from exa_py import Exa
from tavily import TavilyClient
from duckduckgo_search import DDGS
import wikipedia
import arxiv

def main():
    query = os.environ.get("QUERY")
    print(f"Searching for: {query}")

    exa_key = os.environ.get("EXA_API_KEY")
    tavily_key = os.environ.get("TAVILY_API_KEY")

    if exa_key:
        print("\n--- Exa ---")
        try:
            exa = Exa(exa_key)
            result = exa.search(query, num_results=3, use_autoprompt=True)
            for res in result.results:
                print(f"Title: {res.title}\nURL: {res.url}\n")
        except Exception as e:
            print(f"Exa search failed: {e}")

    if tavily_key:
        print("\n--- Tavily ---")
        try:
            tavily = TavilyClient(api_key=tavily_key)
            response = tavily.search(query=query, search_depth="basic")
            for res in response['results']:
                print(f"Title: {res['title']}\nURL: {res['url']}\nContent: {res['content']}\n")
        except Exception as e:
            print(f"Tavily search failed: {e}")

    print("\n--- DuckDuckGo ---")
    try:
        ddgs = DDGS()
        results = list(ddgs.text(query, max_results=3))
        for res in results:
            print(f"Title: {res['title']}\nURL: {res['href']}\nBody: {res['body']}\n")
    except Exception as e:
         print(f"DuckDuckGo search failed: {e}")

    print("\n--- Wikipedia ---")
    try:
        results = wikipedia.search(query, results=3)
        for res in results:
            try:
                page = wikipedia.page(res)
                print(f"Title: {page.title}\nURL: {page.url}\nSummary: {page.summary[:200]}...\n")
            except:
                pass
    except Exception as e:
         print(f"Wikipedia search failed: {e}")

    print("\n--- Arxiv ---")
    try:
        search = arxiv.Search(
          query = query,
          max_results = 3,
          sort_by = arxiv.SortCriterion.Relevance
        )
        for result in search.results():
          print(f"Title: {result.title}\nURL: {result.pdf_url}\nSummary: {result.summary[:200]}...\n")
    except Exception as e:
         print(f"Arxiv search failed: {e}")

if __name__ == "__main__":
    if os.environ.get("QUERY"):
        main()
    else:
        print("QUERY environment variable is required.")
