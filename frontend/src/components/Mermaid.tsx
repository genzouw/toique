import { useEffect, useId, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
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
        setSvg(svgContent);
      } catch (err) {
        console.error('Mermaid rendering failed', err);
      }
    };
    renderChart();
  }, [chart]);

  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}
