import { useEffect, useId, useRef, useState } from 'react';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict',
});

interface MermaidProps {
  chart: string;
}

export default function Mermaid({ chart }: MermaidProps) {
  const [svg, setSvg] = useState('');
  const uniqueId = useId();
  const id = useRef(`mermaid-${uniqueId.replace(/:/g, '')}`);

  useEffect(() => {
    let ignore = false;
    const renderChart = async () => {
      try {
        const { svg: svgContent } = await mermaid.render(id.current, chart);
        if (!ignore) {
          setSvg(DOMPurify.sanitize(svgContent));
        }
      } catch (err) {
        if (!ignore) {
          console.error('Mermaid rendering failed', err);
        }
      }
    };
    renderChart();
    return () => {
      ignore = true;
    };
  }, [chart]);

  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}
