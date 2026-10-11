## 2025-01-20 - Ensure aria-hidden on decorative icons inside buttons and links
**Learning:** Decorative icons (like `<X>` inside a close button or `<Shield>` next to text) that are wrapped in interactive elements which already possess an `aria-label` or visible text must have `aria-hidden="true"`. Without this, screen readers may announce the icon redundantly or cryptically, worsening the user experience.
**Action:** When placing decorative or illustrative SVG icons inside buttons or links, explicitly set `aria-hidden="true"` on the icon element to prevent redundant announcements.
