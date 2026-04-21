## 2026-04-18 - Added missing ARIA labels to close and delete buttons

**Learning:** Found multiple icon-only buttons (`<X />` and `<Trash2 />`) across Layout and FormSchemaBuilder components that were missing `aria-label`s or proper focus states, making them inaccessible to screen readers. This indicates a minor accessibility blind spot for icon-only interactions.

**Action:** Add `aria-label`s to all icon-only buttons to ensure they're understandable by screen readers, following the pattern already present in some other components.

## 2026-04-22 - Added loading spinner to refresh buttons

**Learning:** Found that async operations like refreshing lists in `Messages` and `Submissions` pages lacked visual feedback during loading, leading to potential duplicate clicks. By utilizing existing Tailwind classes (`animate-spin`, `disabled:opacity-50`, `disabled:cursor-not-allowed`) and component state (`loading`), we can provide immediate, standard feedback.
**Action:** Always verify if async buttons properly bind to the component's `loading` or `submitting` state to ensure proper disabling and visual feedback.
