## 2025-07-29 - Dynamic Search Results Screen Reader Announcements

**Learning:** For single-page applications with instant client-side search (like `FaqHub.tsx`), visually rendering search results isn't enough. Screen readers are unaware that the DOM updated below the input field unless explicitly told, which makes the app feel unresponsive or broken to a11y users.
**Action:** Always add `role="status"` and `aria-live="polite"` to elements containing dynamic search result counts or "No results found" messages so screen readers automatically announce these updates without interrupting the user's typing flow.
