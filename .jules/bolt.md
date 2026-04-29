## 2024-04-29 - [Optimized forms list endpoint payload size]
**Learning:** Returning entire JSON structures (like form schemas) in list endpoints drastically increases payload size and memory footprint during serialization and network transfer, especially when this data isn't rendered in the list UI.
**Action:** When creating or modifying Drizzle list queries (`db.select()`), explicitly exclude unused large JSON columns. In the frontend, use `Omit<T, 'large_field'>` to create a lightweight list item type.
