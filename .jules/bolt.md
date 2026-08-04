## 2024-08-04 - Preventing form-driven re-renders of lists
**Learning:** Having form state directly drive re-renders of adjacent large lists in single-file page components is a common React performance anti-pattern. Every keystroke triggers a re-render of the list.
**Action:** Extract list item rendering logic into a new component and wrap it in `React.memo()`. Use `useCallback` for functions passed as props to the list item component to keep their references stable across re-renders.
