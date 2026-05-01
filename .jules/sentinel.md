## 2025-04-22 - XSS Vulnerability in Mermaid Component

**Vulnerability:** The `Mermaid.tsx` frontend component rendered chart SVGs directly into the DOM using `dangerouslySetInnerHTML` with `mermaid`'s `securityLevel` set to `'loose'`. This created an XSS vulnerability, as malicious or unescaped user-controlled chart strings could inject `<script>` tags or malicious attributes into the generated SVG and execute client-side code.
**Learning:** Even though `mermaid` has internal security levels, when generating SVGs that are directly injected into React using `dangerouslySetInnerHTML`, the output cannot be implicitly trusted, particularly if user data flows into the chart definitions.
**Prevention:** Always sanitize the output HTML/SVG of third-party rendering libraries before using `dangerouslySetInnerHTML`. Use `dompurify` (i.e. `DOMPurify.sanitize(svgContent)`) as a defense-in-depth measure. Additionally, ensure the underlying library's security configurations (e.g. `mermaid`'s `securityLevel`) are set as strictly as possible (`'strict'`).

## 2025-02-28 - CSV Formula (Macro) Injection in Exports

**Vulnerability:** The `/export` route in `backend/src/routes/submissions.ts` did not sanitize user input when exporting form submissions to CSV. If a user submitted a string starting with characters like `=`, `+`, `-`, `@`, `\t`, `\r`, or `\n`, opening the resulting CSV in Microsoft Excel or similar spreadsheet applications could execute the payload as a formula or macro.
**Learning:** CSV formula injection can often be overlooked because the output appears safe as plain text. The application's existing `escapeCsv` function only handled escaping quotes and commas for CSV syntax correctness, but not prefix characters that trigger spreadsheet evaluation.
**Prevention:** Always sanitize data intended for CSV export by prepending a single quote (`'`) to values that start with `=` `+` `-` `@` `\t` `\r` `\n` to neutralize formula execution in spreadsheet software while preserving the visible data. Ensure this logic is unit tested directly against the module.

## 2026-04-24 - Prevent Timing Attack in Admin Authentication

**Vulnerability:** The `requireOperator` middleware compared the admin credentials using `timingSafeEqual` after an initial length check that used `&&`. Since `&&` short-circuits, it immediately returned if lengths didn't match, failing to prevent timing attacks that leak the exact length of the expected secret.
**Learning:** Checking lengths prior to using `timingSafeEqual` undermines its purpose if it allows an early exit. Furthermore, comparing strings of differing lengths with `timingSafeEqual` directly (without the check) throws an error, making simple strings difficult to compare securely in constant time without preprocessing.
**Prevention:** When comparing secrets (like passwords or API keys) of variable or unknown length against an expected secret, first hash both the provided and expected strings using a strong cryptographic hash (like SHA-256) to normalize their lengths. Then, perform a `timingSafeEqual` on the resulting hashes.
