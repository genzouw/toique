import { useEffect, useId, useRef } from 'react';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict',
});

interface MermaidProps {
  chart: string;
  /**
   * When true, registers Mermaid の `bindFunctions` によるイベントリスナー
   * （ツールチップや `click` ディレクティブなど）を描画済み SVG に対して適用する。
   *
   * - `securityLevel: 'strict'` のため `click` コールバックは文字列コード評価されず、
   *   `href` / `title` 等の静的バインドのみが有効。
   * - DOMPurify によるサニタイズは維持したまま、sanitized な DOM に対して
   *   `bindFunctions` を呼び出すため二層防御は保たれる。
   *
   * 省略時は `false`（静的図の表示のみ）。Toique の現ユースケース（Help.tsx
   * のフロー図）は静的表示のみなのでデフォルトでは不要。
   */
  interactive?: boolean;
}

export default function Mermaid({ chart, interactive = false }: MermaidProps) {
  const uniqueId = useId();
  const id = useRef(`mermaid-${uniqueId.replace(/:/g, '')}`);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ignore = false;
    const renderChart = async () => {
      try {
        const { svg: svgContent, bindFunctions } = await mermaid.render(
          id.current,
          chart,
        );
        const container = containerRef.current;
        if (ignore || !container) {
          return;
        }
        const sanitized = DOMPurify.sanitize(svgContent, {
          USE_PROFILES: { svg: true },
          // Mermaid のフローチャートはノードラベルを <foreignObject> 内の HTML
          // (<div>/<span>/<p>/<br>) として描画する。`USE_PROFILES.svg` のみだと
          // <foreignObject> 自体および中身の HTML が剥がされてラベル文字や
          // 明示的な改行 (<br>) が失われるため、必要なタグを明示的に許可する。
          ADD_TAGS: ['style', 'foreignObject', 'div', 'span', 'p', 'br'],
        });
        container.innerHTML = sanitized;
        if (interactive) {
          bindFunctions?.(container);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Mermaid rendering failed', err);
          if (containerRef.current) {
            containerRef.current.innerHTML = '';
          }
        }
      }
    };
    renderChart();
    return () => {
      ignore = true;
    };
  }, [chart, interactive]);

  return <div ref={containerRef} />;
}
