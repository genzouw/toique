import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { initGA } from './lib/ga';
import { resolveCanonicalUrl } from './lib/canonical-host';

const canonicalUrl = resolveCanonicalUrl(window.location);
if (canonicalUrl) {
  // 履歴に既定ドメインを残さないよう replace で移る
  window.location.replace(canonicalUrl);
} else {
  initGA();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
