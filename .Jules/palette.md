## 2024-05-15 - [Add title attributes to icon-only buttons]

**Learning:** React components using `lucide-react` icons inside `<button>` elements consistently use `aria-label` for screen reader accessibility, but lack native visual tooltips for sighted mouse users. Adding a matching `title` attribute solves this without requiring custom Tooltip components.
**Action:** When implementing icon-only buttons, consistently pair the `aria-label` attribute with a matching `title` attribute.

## 2024-05-25 - [Use explicit label bindings]

**Learning:** React forms implicitly wrapping inputs within `<label>` tags (e.g. `<label>Email <input /></label>`) can be less predictable for some screen readers and automated testing frameworks. Explicit bindings using `id` on the input and `htmlFor` on the label (e.g. `<label htmlFor="email">Email</label> <input id="email" />`) provide more reliable accessibility associations.
**Action:** Always prefer explicit `<label htmlFor="x">` and `<input id="x" />` mappings over implicitly wrapping `<label>` around inputs.
