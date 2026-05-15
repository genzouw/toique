## 2024-05-15 - [Add title attributes to icon-only buttons]
**Learning:** React components using `lucide-react` icons inside `<button>` elements consistently use `aria-label` for screen reader accessibility, but lack native visual tooltips for sighted mouse users. Adding a matching `title` attribute solves this without requiring custom Tooltip components.
**Action:** When implementing icon-only buttons, consistently pair the `aria-label` attribute with a matching `title` attribute.
