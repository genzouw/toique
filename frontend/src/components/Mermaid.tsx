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
    const renderChart = async () => {
      try {
        const { svg: svgContent } = await mermaid.render(id.current, chart);
        setSvg(DOMPurify.sanitize(svgContent));
      } catch (err) {
        console.error('Mermaid rendering failed', err);
      }
    };
    renderChart();
  }, [chart]);

  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}
