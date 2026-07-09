## 2024-07-09 - [Dynamic Intl.DateTimeFormat Instantiation in List Rendering]
**Learning:** Calling `new Date().toLocaleString("ja-JP")` or repeatedly creating `Intl.DateTimeFormat` inside loop constructs or React lists is a significant performance bottleneck (e.g., ~110x slower) because it allocates a new formatter object every time.
**Action:** Extract the formatting logic into a globally memoized `Intl.DateTimeFormat` instance and export a reusable utility function to prevent repeated instantiations during rendering.
