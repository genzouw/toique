## 2024-05-27 - O(1) Lookup Maps for Static Arrays

**Learning:** Using `Array.prototype.find()` on a static array inside a render loop or frequently called helper function (`getFaq`, `getRelated`) causes unnecessary O(N) overhead. When items have unique identifiers (like `slug`), this can be optimized by generating an O(1) lookup map (e.g., `Record<string, ItemType>`) at module load time.
**Action:** Always prefer initializing a hash map (`FAQ_MAP`) for fast, constant-time lookups when dealing with frequent reads from a static or rarely-changing array. This improves both readability and scaling as the data grows.
