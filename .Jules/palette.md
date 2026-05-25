## 2024-05-15 - [Add title attributes to icon-only buttons]

**Learning:** React components using `lucide-react` icons inside `<button>` elements consistently use `aria-label` for screen reader accessibility, but lack native visual tooltips for sighted mouse users. Adding a matching `title` attribute solves this without requiring custom Tooltip components.
**Action:** When implementing icon-only buttons, consistently pair the `aria-label` attribute with a matching `title` attribute.

## 2024-05-24 - Explicit Label Binding in Forms

**Learning:** Found legacy React components mapping standard `<label>` tags by nesting the `<input>` inside them implicitly. While acceptable by some tools, strict a11y standards heavily prefer explicit mapping via `htmlFor` on the label and `id` on the input.
**Action:** When creating form inputs, always use React's `useId()` hook to guarantee unique IDs, decouple the structural hierarchy of input/label blocks, and ensure bulletproof a11y cross-browser and cross-screen-reader compatibility.
