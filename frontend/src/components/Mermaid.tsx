import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

let idCounter = 0;

interface MermaidProps {
  chart: string;
}

export default function Mermaid({ chart }: MermaidProps) {
  const [svg, setSvg] = useState('');
  const id = useRef(`mermaid-${idCounter++}`);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    });

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
