## 2025-05-23 - Empty State Accessibility
**Learning:** Generic EmptyState components need both `role="status"` and `aria-live="polite"` to ensure screen readers announce their content when they dynamically replace lists or loading states.
**Action:** Always add `aria-live="polite"` alongside `role="status"` on dynamic feedback components like empty states.
