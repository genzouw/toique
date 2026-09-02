# /// script
# dependencies = [
#   "exa_py",
#   "tavily-python",
#   "duckduckgo-search",
#   "arxiv",
#   "wikipedia"
# ]
# ///

import os
import sys
import json

def generate_search_context(query):
    results = []

    # 1. DuckDuckGo (Free)
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            ddg_results = [r for r in ddgs.text(query, max_results=3)]
            if ddg_results:
                results.append("### DuckDuckGo Search Results")
                for r in ddg_results:
                    results.append(f"- **{r.get('title', 'No Title')}**: {r.get('body', '')} ({r.get('href', '')})")
    except Exception as e:
        results.append(f"<!-- DDG error: {e} -->")

    # 2. Exa AI (Requires API Key)
    exa_key = os.environ.get("EXA_API_KEY")
    if exa_key:
        try:
            from exa_py import Exa
            exa = Exa(exa_key)
            exa_response = exa.search_and_contents(
                query,
                type="neural",
                use_autoprompt=True,
                num_results=2,
                text=True
            )
            if exa_response.results:
                results.append("### Exa AI Search Results")
                for r in exa_response.results:
                    results.append(f"- **{r.title}**: {r.text[:300]}... ({r.url})")
        except Exception as e:
            results.append(f"<!-- Exa error: {e} -->")

    # 3. Tavily (Requires API Key)
    tavily_key = os.environ.get("TAVILY_API_KEY")
    if tavily_key:
        try:
            from tavily import TavilyClient
            tavily = TavilyClient(api_key=tavily_key)
            tavily_response = tavily.search(query=query, search_depth="basic", max_results=2)
            if tavily_response.get("results"):
                results.append("### Tavily Search Results")
                for r in tavily_response["results"]:
                    results.append(f"- **{r.get('title', 'No Title')}**: {r.get('content', '')} ({r.get('url', '')})")
        except Exception as e:
            results.append(f"<!-- Tavily error: {e} -->")

    if not results:
        return "No search results found or APIs unavailable."

    return "\n\n".join(results)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: uv run search.py <query>")
        sys.exit(1)

    query = sys.argv[1]
    context = generate_search_context(query)

    # GitHub Actions output
    with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
        # Multiline output handling
        f.write("context<<EOF\n")
        f.write(context + "\n")
        f.write("EOF\n")
