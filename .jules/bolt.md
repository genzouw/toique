## 2024-07-31 - [Submissions List Rendering Optimization]
**Learning:** Extracting list item rendering into separate components wrapped in `React.memo()` significantly reduces virtual DOM diffing overhead when unrelated parent state changes. This is especially true for tables where each row might contain complex nested structures or serialization logic (like `JSON.stringify`).
**Action:** Always verify if large lists re-render unnecessarily due to unrelated parent state changes, and use `React.memo()` on individual row components when appropriate to prevent this.
