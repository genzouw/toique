# /// script
# dependencies = [
#   "pytest>=8,<9",
#   "requests>=2.31,<3",
#   "exa-py>=1,<3",
# ]
# ///
"""_DuckDuckGoResultParser の抽出ロジックを検証する回帰テスト。

通常の検索結果HTMLとボット検証ページHTMLの両方をfixtureとして固定し、
DuckDuckGo側のHTML構造が変わったときの回帰に早期に気づけるようにする。

search.py を import するため、search.py と同じ依存（requests / exa-py）を
このスクリプト自身のインライン依存にも明記している。

実行方法: uv run .github/actions/ai-web-search/test_search.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from search import _DuckDuckGoResultParser  # noqa: E402


NORMAL_RESULT_HTML = """
<div class="result">
  <a class="result__a" href="https://example.com/page1">Example Page 1</a>
  <a class="result__url" href="https://example.com/page1">example.com/page1</a>
  <a class="result__snippet">This is a <b>snippet</b> for page 1.</a>
</div>
<div class="result">
  <a class="result__a" href="https://example.com/page2">Example Page 2</a>
  <a class="result__url" href="https://example.com/page2">example.com/page2</a>
  <a class="result__snippet">Second snippet text.</a>
</div>
"""

# DuckDuckGo がボットと判定した際に返す簡易ページ。result__* クラスを
# 含まないため、パーサーは例外を出さず空リストを返すべき。
BOT_CHALLENGE_HTML = """
<!DOCTYPE html>
<html>
  <body>
    <div class="anomaly-modal__title">Unfortunately, bots use DuckDuckGo too.</div>
    <form id="challenge-form" action="/html/"></form>
  </body>
</html>
"""


def test_parses_normal_results():
    parser = _DuckDuckGoResultParser()
    parser.feed(NORMAL_RESULT_HTML)

    assert len(parser.results) == 2
    assert parser.results[0] == {
        "url": "https://example.com/page1",
        "title": "Example Page 1",
        "snippet": "This is a snippet for page 1.",
    }
    assert parser.results[1]["title"] == "Example Page 2"
    assert parser.results[1]["snippet"] == "Second snippet text."


def test_bot_challenge_page_yields_no_results():
    parser = _DuckDuckGoResultParser()
    parser.feed(BOT_CHALLENGE_HTML)

    assert parser.results == []


if __name__ == "__main__":
    import pytest

    sys.exit(pytest.main([__file__, "-v"]))
