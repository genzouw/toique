## 2024-10-18 - Pre-compute searchable string targets for static datasets

**Learning:** In frontend search filtering on static datasets, transforming strings (e.g., `.toLowerCase()`) on every keystroke during render causes expensive O(N) string allocations and performance overhead.
**Action:** Pre-compute searchable string targets (like concatenated lowercased text) once at the module level outside the React component.
