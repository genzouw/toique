## 2024-05-27 - O(1) Lookup Maps for Static Arrays

**Learning:** Using `Array.prototype.find()` on a static array inside a render loop or frequently called helper function (`getFaq`, `getRelated`) causes unnecessary O(N) overhead. When items have unique identifiers (like `slug`), this can be optimized by generating an O(1) lookup map (e.g., `Record<string, ItemType>`) at module load time.
**Action:** Always prefer initializing a hash map (`FAQ_MAP`) for fast, constant-time lookups when dealing with frequent reads from a static or rarely-changing array. This improves both readability and scaling as the data grows.

## 2024-05-27 - Avoid Fetching Full Collections for Counts

**Learning:** Dashboards often need counts of various entities (like channels or forms). Fetching the entire collection (e.g., `api.listChannels()`) just to read the `length` property is a severe anti-pattern that wastes database I/O, network bandwidth, and memory.
**Action:** Always check if there is an existing usage or stats endpoint (like `api.getUsage()`) that already provides the pre-calculated count before making a dedicated API call to fetch a full list just for its length.
