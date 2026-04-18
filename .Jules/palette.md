## 2026-04-18 - Added missing ARIA labels to close and delete buttons

**Learning:** Found multiple icon-only buttons (`<X />` and `<Trash2 />`) across Layout and FormSchemaBuilder components that were missing `aria-label`s or proper focus states, making them inaccessible to screen readers. This indicates a minor accessibility blind spot for icon-only interactions.

**Action:** Add `aria-label`s to all icon-only buttons to ensure they're understandable by screen readers, following the pattern already present in some other components.
