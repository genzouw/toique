## 2024-05-30 - Optimize static React components
**Learning:** Pure presentational React components (e.g., `SiteHeader`, `SiteFooter`) that receive no props but are nested within layout components will unnecessarily re-render when the parent state changes (like route or auth state).
**Action:** Always wrap static/pure layout components with `React.memo()` to prevent unnecessary virtual DOM diffing overhead.
