## 2026-04-18 - Added missing ARIA labels to close and delete buttons

**Learning:** Found multiple icon-only buttons (`<X />` and `<Trash2 />`) across Layout and FormSchemaBuilder components that were missing `aria-label`s or proper focus states, making them inaccessible to screen readers. This indicates a minor accessibility blind spot for icon-only interactions.

**Action:** Add `aria-label`s to all icon-only buttons to ensure they're understandable by screen readers, following the pattern already present in some other components.

## 2026-04-22 - Added loading spinner to refresh buttons

**Learning:** Found that async operations like refreshing lists in `Messages` and `Submissions` pages lacked visual feedback during loading, leading to potential duplicate clicks. By utilizing existing Tailwind classes (`animate-spin`, `disabled:opacity-50`, `disabled:cursor-not-allowed`) and component state (`loading`), we can provide immediate, standard feedback.
**Action:** Always verify if async buttons properly bind to the component's `loading` or `submitting` state to ensure proper disabling and visual feedback.

## 2026-04-22 - Established reusable empty state pattern

**Learning:** Empty states consisting of just a gray icon and text felt too bare and unhelpful. Replacing them with a consistent pattern (a light-gray circular background for the icon, a dark heading, a supportive secondary text explaining the next step, and optionally a CTA button) significantly improves the empty page experience.
**Action:** When implementing lists or data tables that can be empty, proactively use the established empty state structure (`flex-col items-center p-12`, circular icon background, title, description, and CTA) instead of just generic text.

## 2025-02-12 - Reusable LoadingButton for consistent Async UI

**Learning:** For frontend UI consistency during async operations (like form submissions), it is crucial to use the existing `LoadingButton` component (`frontend/src/components/LoadingButton.tsx`) instead of manually managing loading text/spinners inside standard HTML `<button>` tags. This provides a unified spinner animation and disabled state across the application.
**Action:** When implementing new forms or refactoring existing ones, always check for the availability of `LoadingButton` and utilize it to ensure visual consistency and correct accessibility states during loading.

## 2024-05-01 - [Loading State Accessibility]

**Learning:** Standardizing loading spinners across the app with `aria-busy` and `aria-hidden` on icons significantly improves screen reader support during async operations.
**Action:** Use the enhanced `LoadingButton` component instead of manually handling standard `<button>` tags with inline spinners for form submissions and async actions.
