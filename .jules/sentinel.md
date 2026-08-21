## 2024-08-21 - Cache Flooding Rate Limit Bypass
**Vulnerability:** A cache flooding vulnerability in `backend/src/routes/contact.ts` where attackers can bypass the rate limit by flooding the in-memory map to trigger eviction of their own tracked IP before it reaches the limit.
**Learning:** The previous implementation blindly deleted the oldest entry in the map when `MAX_BUCKETS` was reached, regardless of whether that entry was actually expired or actively tracking failed attempts.
**Prevention:** Always enforce strict maximum size limits on in-memory caches, but when limits are reached, always scan and evict expired entries first before blindly deleting the oldest inserted key. This prevents attackers from pushing out their active tracking entries by flooding the cache.
