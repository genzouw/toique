## 2025-04-22 - XSS Vulnerability in Mermaid Component
**Vulnerability:** The `Mermaid.tsx` frontend component rendered chart SVGs directly into the DOM using `dangerouslySetInnerHTML` with `mermaid`'s `securityLevel` set to `'loose'`. This created an XSS vulnerability, as malicious or unescaped user-controlled chart strings could inject `<script>` tags or malicious attributes into the generated SVG and execute client-side code.
**Learning:** Even though `mermaid` has internal security levels, when generating SVGs that are directly injected into React using `dangerouslySetInnerHTML`, the output cannot be implicitly trusted, particularly if user data flows into the chart definitions.
**Prevention:** Always sanitize the output HTML/SVG of third-party rendering libraries before using `dangerouslySetInnerHTML`. Use `dompurify` (i.e. `DOMPurify.sanitize(svgContent)`) as a defense-in-depth measure. Additionally, ensure the underlying library's security configurations (e.g. `mermaid`'s `securityLevel`) are set as strictly as possible (`'strict'`).

## 2024-05-24 - [Add secureHeaders middleware]
**Vulnerability:** Missing security headers (like Content-Security-Policy, X-Content-Type-Options, etc.) on responses.
**Learning:** The Hono `secureHeaders` middleware was missing, leaving the application vulnerable to common web vulnerabilities like XSS and clickjacking.
**Prevention:** Always apply the `secureHeaders` middleware globally to Hono applications early in the middleware stack.
