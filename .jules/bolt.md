## 2024-05-24 - React List Rendering Performance
**Learning:** In React, mapping over arrays directly inside a large page component can cause unnecessary re-renders of list items when unrelated state changes occur in the parent component.
**Action:** Always extract list item rendering logic into a separate component wrapped in `React.memo()`. This ensures referential stability and prevents unnecessary virtual DOM diffing for lists.
