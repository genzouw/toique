💡 What: Added `role="status"` and `aria-live="polite"` to the dynamic search result count paragraphs in the FAQ Hub.

🎯 Why: In single-page applications with instant client-side search, visually rendering search results isn't enough. Screen readers are unaware that the DOM updated below the input field. These attributes ensure screen readers automatically announce updates to the search results without interrupting the user's typing flow.

📸 Before/After: Visuals remain unchanged, but screen readers will now announce "N 件" or "見つかりませんでした" when the search results update dynamically.

♿ Accessibility: Ensures that dynamic changes to search results are announced to screen reader users (WCAG 4.1.2 Name, Role, Value).
