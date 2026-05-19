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

// Mermaid v11 のフローチャートはノードラベルを <foreignObject> 内に xhtml 名前空間の
// <div>/<span>/<p>/<br> として描画する。DOMPurify の SVG プロファイルは xhtml 子要素を
// 剥がしてしまうため、SVG 本体と foreignObject 内 HTML を別プロファイルで二段階に
// サニタイズし、最後に foreignObject へ戻す。これでラベル文字を保持しつつ、XSS は
// foreignObject 内外いずれの注入も防げる（中身は HTML profile、外側は SVG profile）。
function sanitizeMermaidSvg(svgContent: string): string {
  // text/html パーサーを使う。`image/svg+xml` だと <br> が XML void でないため
  // 後続テキストノードを巻き込んで壊れる。HTML パーサーは foreignObject 内の
  // HTML を仕様通り解釈するので Mermaid 出力をそのまま読める。
  const parser = new DOMParser();
  const sourceDoc = parser.parseFromString(svgContent, 'text/html');
  const sourceSvg = sourceDoc.querySelector('svg');
  if (!sourceSvg) {
    return '';
  }

  // 1. 各 foreignObject の中身を HTML として抽出し、HTML プロファイルでサニタイズして退避。
  const sourceForeignObjects = sourceSvg.querySelectorAll('foreignObject');
  const sanitizedInners: string[] = Array.from(sourceForeignObjects).map((fo) =>
    DOMPurify.sanitize(fo.innerHTML, {
      ALLOWED_TAGS: ['div', 'span', 'p', 'br'],
      ALLOWED_ATTR: ['class', 'style', 'xmlns'],
    }),
  );

  // 2. SVG 全体は SVG プロファイル + `style`/`foreignObject` の追加許可でサニタイズ。
  //    この段で foreignObject の中身は剥がれるが、骨格と各種属性は保護される。
  const sanitizedSvg = DOMPurify.sanitize(svgContent, {
    USE_PROFILES: { svg: true },
    ADD_TAGS: ['style', 'foreignObject'],
  });

  // 3. サニタイズ済み SVG をパースし直し、空になった foreignObject へ退避したラベルを戻す。
  const wrapper = document.createElement('div');
  wrapper.innerHTML = sanitizedSvg;
  const resultSvg = wrapper.querySelector('svg');
  if (!resultSvg) {
    return '';
  }
  const resultForeignObjects = resultSvg.querySelectorAll('foreignObject');
  // サニタイズで foreignObject が除去された場合、インデックス不整合を防ぐ
  if (resultForeignObjects.length !== sanitizedInners.length) {
    console.warn(
      'foreignObject count mismatch after sanitization:',
      sanitizedInners.length,
      '→',
      resultForeignObjects.length,
    );
  }
  resultForeignObjects.forEach((fo, i) => {
    const inner = sanitizedInners[i];
    if (inner) {
      fo.innerHTML = inner;
    }
  });

  return resultSvg.outerHTML;
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
        container.innerHTML = sanitizeMermaidSvg(svgContent);
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
