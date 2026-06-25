## 2024-06-25 - Redundant role="status" in generic components
**Learning:** When creating generic wrapper components (like `EmptyState`) that apply `role="status"`, nesting another `role="status"` inside can cause screen readers to announce the content redundantly or inconsistently.
**Action:** Apply ARIA roles like `status` only at the highest necessary level within a component, and avoid nesting them to ensure a single, clear announcement.
