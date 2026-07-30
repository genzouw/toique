## 2023-10-27 - FaqHub Search Results Accessibility
**Learning:** For dynamic client-side search implementations (like FaqHub), updating DOM content below an input field is invisible to screen readers without ARIA attributes, breaking the user's flow.
**Action:** Always wrap both the "results found" and "no results found" dynamically updating sections with `role="status"` and `aria-live="polite"` to ensure screen readers announce state changes automatically.
