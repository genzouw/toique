## 2025-02-12 - Dashboard Component Re-renders
**Learning:** `StatCard` and `UsageBar` in the `Dashboard` component were pure presentational components, but re-rendered whenever unrelated parent state (like the `managing` portal transition) changed.
**Action:** Wrapped them in `React.memo` to skip shallow-equal props re-renders, adhering to the strategy used in `EmptyState` and `ErrorAlert`.
